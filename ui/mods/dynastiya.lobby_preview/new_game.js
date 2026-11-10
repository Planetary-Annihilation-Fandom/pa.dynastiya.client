var lobbySystemPreviewLoaded;

function lobbySystemPreview()
{

    if ( lobbySystemPreviewLoaded )
    {
        return;
    }

    lobbySystemPreviewLoaded = true;

    var helpText = 'Once a system is loaded hover over a planet to focus the camera then use the arrow keys to move around. Metal is not generated until the game starts so cannot be shown. Close the preview to stop rendering; enable Preview Opacity to keep it behind the roster.';

    console.log( 'com.pa.mikeyh.lobby-system-preview new_game.js' );

    model.holodeck = false;

    model.lobbySystemPreview_opacity = ko.observable( false ).extend({ local: 'lobbySystemPreview_opacity' } );

    model.lobbySystemPreview_toggleOpacity = function()
    {
        model.lobbySystemPreview_opacity( ! model.lobbySystemPreview_opacity() );
    }

    $('td.col_2').prepend('<div id="lobby-system-preview-close" class="btn_std" data-bind="click: function() { model.lobbySystemPreview_show(false); }, visible: model.lobbySystemPreview_show"><div class="btn_label">X</div></div>');

    $('td.col_2').prepend('<holodeck id="lobby-system-preview" data-bind="event: { mouseenter: function() { model.lobbySystemPreview_release(); }}" style="display:none; position:absolute; top: 0; left: 0; width: 100%; height: 100%; z-index:-1" ></holodeck>');

    $('#system .section_header').append('<label id="lobby-system-preview-opacity" data-placement="auto top" data-container="body" data-bind="click: lobbySystemPreview_toggleOpacity, tooltip: \'Integrated / Low Spec GPU Killer\'"><input type="checkbox" style="pointer-events: none !important;" data-bind="checked: lobbySystemPreview_opacity" />Preview Opacity</label>');

    model.lobbySystemPreview_available = ko.observable( false );
    var previewGeneration = 0;
    var focusTimer;
    var hoveredPlanet;
    var disposed = false;
    var resetting = false;
    var subscriptions = [];

    model.lobbySystemPreview_show = ko.observable(false);
    model.lobbySystemPreview_active = ko.computed(function () {
        return model.gameSystemReady() && model.startingGameCountdown() === -1 &&
            (model.lobbySystemPreview_show() || model.lobbySystemPreview_opacity());
    });

    model.lobbySystemPreview_focus = function()
    {
        if ( ! model.lobbySystemPreview_available() || !model.lobbySystemPreview_active() )
        {
            return;
        }

        model.holodeck.focus();

        if (hoveredPlanet !== undefined) {
            api.camera.focusPlanet(hoveredPlanet);
            api.camera.setZoom('orbital');
            api.camera.alignToPole();
        }
        else if ( model.planetBiomes().length == 1 )
        {
            api.camera.focusPlanet( 0 );
            api.camera.setZoom('orbital');
            api.camera.alignToPole();
        }
        else
        {
            api.camera.setZoom('celestial');
        }
    }

    model.lobbySystemPreview_create = function()
    {
        if (disposed || resetting || !model.lobbySystemPreview_active() || model.holodeck || !$('#lobby-system-preview').length) return;

        var $holodeck = $('#lobby-system-preview');
        var generation = ++previewGeneration;

        model.holodeck = new api.Holodeck( $holodeck, { visible: true, noFocus: true }, function( holodeck )
        {
            if (generation !== previewGeneration) return;
            model.lobbySystemPreview_available( true );
            if (!model.lobbySystemPreview_active()) return;
            focusTimer = _.delay(function () {
                if (generation === previewGeneration) model.lobbySystemPreview_focus();
            }, 200);
        });

    }

    model.lobbySystemPreview_destroy = function()
    {

        resetting = true;
        model.lobbySystemPreview_show( false );
        model.lobbySystemPreview_available( false );
        ++previewGeneration;
        clearTimeout(focusTimer);

        if (model.holodeck) model.holodeck.destroy();

        model.holodeck = false;
        hoveredPlanet = undefined;
        $('#lobby-system-preview').hide();
        resetting = false;

    }

    function updatePreview() {
        if (disposed || resetting) return;
        var active = model.lobbySystemPreview_active();
        $('#lobby-system-preview').toggle(active);
        if (!active) {
            clearTimeout(focusTimer);
            // Keep the camera for reopening, but stop native rendering and polling.
            if (model.holodeck) {
                model.holodeck.update();
                api.game.captureKeyboard(true);
            }
            return;
        }
        model.lobbySystemPreview_create();
        if (model.holodeck) model.holodeck.update();
    }
    subscriptions.push(model.lobbySystemPreview_active.subscribe(updatePreview));
    subscriptions.push(model.startingGameCountdown.subscribe(function (countdown) {
        if (countdown !== -1) model.lobbySystemPreview_destroy();
        else updatePreview();
    }));

    model.lobbySystemPreview_toggleShow = function()
    {
        model.lobbySystemPreview_show( ! model.lobbySystemPreview_show() );
    }

    model.lobbySystemPreview_planet_hover = function( planetIndex, event )
    {
        var biome = model.planetBiomes()[ planetIndex ];

        if ( biome == 'asteroid' )
        {
            return;
        }

        hoveredPlanet = planetIndex;
        if (!model.lobbySystemPreview_opacity()) model.lobbySystemPreview_show(true);
        updatePreview();
        model.lobbySystemPreview_focus();

    }

    model.lobbySystemPreview_stop = function( event )
    {
    }

    model.lobbySystemPreview_capture = function( event )
    {
        api.game.captureKeyboard(true);
    }

    model.lobbySystemPreview_release = function( event )
    {
        if (!model.lobbySystemPreview_active() || !model.lobbySystemPreview_available()) return;
        api.game.releaseKeyboard();

        if ( model.holodeck )
        {
            model.holodeck.focus(true);
        }
    }

    subscriptions.push(model.gameSystemReady.subscribe(function (ready) {
        if (ready) updatePreview();
        else model.lobbySystemPreview_destroy();
    }));
    updatePreview();
    $(window).on('beforeunload.dynastiyaPreview', function () {
        disposed = true;
        subscriptions.forEach(function (subscription) { subscription.dispose(); });
        model.lobbySystemPreview_active.dispose();
        model.lobbySystemPreview_destroy();
    });

    model.lobbySystemPreview_add_data_bind = function( selector, binding )
    {

        var bindings = $( selector ).attr( 'data-bind' );

        bindings = ( bindings ? bindings + ', ' : '' ) + binding;

        $( selector ).attr( 'data-bind', bindings );

    }

    model.lobbySystemPreview_add_data_bind( 'div.dropdown-system-picker div.div_planet', 'event: { mouseenter: function( data, event ) { model.lobbySystemPreview_planet_hover( $index(), event ) } }' );

    model.lobbySystemPreview_add_data_bind( 'div.armies', 'event: { mouseenter: model.lobbySystemPreview_capture, mouseleave: model.lobbySystemPreview_release }' );

    model.lobbySystemPreview_add_data_bind( 'td.col_1', 'event: { mouseenter: model.lobbySystemPreview_capture, mouseleave: model.lobbySystemPreview_release }' );

    model.lobbySystemPreview_add_data_bind( '#mod_names', 'event: { mouseenter: model.lobbySystemPreview_capture, mouseleave: model.lobbySystemPreview_release }' );

    model.lobbySystemPreview_add_data_bind( 'body', 'css : { "lobby-system-preview": model.lobbySystemPreview_active() && model.lobbySystemPreview_available() }' );

    model.lobbySystemPreview_add_data_bind( 'div.dropdown-system-picker', "event: { mousewheel: model.lobbySystemPreview_stop, mouseenter: model.lobbySystemPreview_release, mouseleave: model.lobbySystemPreview_capture }, mouseenterBubble: false" );

    model.lobbySystemPreview_add_data_bind( 'table.roster_table', 'css : { "lobby-system-preview": model.lobbySystemPreview_show, "lobby-system-preview-opacity": model.lobbySystemPreview_opacity }' );


    $( 'div.dropdown-system-picker' ).attr( 'no-keyboard', 'no-keyboard' );

    $( 'div.dropdown-system-picker' ).attr( 'data-placement', 'auto top' );

    $( 'div.dropdown-system-picker' ).attr( 'data-container', 'body' );

    _.defer( function()
    {
        model.localChatMessage( 'Lobby System Preview', helpText );
    });

}

try
{
    lobbySystemPreview();
}
catch (e)
{
    console.error (e.stack || e );
}
