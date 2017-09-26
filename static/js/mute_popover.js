var mute_popover = (function () {

var exports = {};

// We handle stream popovers and topic popovers in this
// module.  Both are popped up from the left sidebar.
var current_stream_sidebar_elem;

exports.notifications_muted = function () {
    check_mute_time();
    return $('#mute_notifications_icon').prop('checked');
}

function check_mute_time(){
    // if an unmute hasn't been defined then do nothing
    if (exports.unmuteTime == (undefined || null))
       return;

    var now = new Date();
    //console.log("current time = " + now);
    
    var mute_checkbox = $("#mute_notifications_icon");
    //console.log("unmute time = " + exports.unmuteTime);
    if (now.getTime() >= exports.unmuteTime.getTime()){
        update_mute_setting('');
    }
}

function update_mute_setting(value) {
    var mute_checkbox = $("#mute_notifications_icon");
    mute_checkbox.prop('checked', value != '');

    exports.unmuteTime = new Date();

    if (value == '') {
        //console.log("Unchecking Icon");
        mute_checkbox.removeClass("fa fa-bell-slash fa-bell-slash-o");
	mute_checkbox.addClass("icon-vector-bell");
    } else {
	var minutesToAdd = 0;
        switch (value){
            case '30m':
                minutesToAdd = 1;
            break;
            case '1h':
                minutesToAdd = 5;
            break;
            case '2h':
                minutesToAdd = 120;
            break;
            case '4h':
                minutesToAdd = 240;
            break;
        }

        exports.unmuteTime.setMinutes(exports.unmuteTime.getMinutes() + minutesToAdd);
        //console.log("Checking Icon");
        mute_checkbox.removeClass("icon-vector-bell fa fa-bell-slash");
        mute_checkbox.addClass("fa fa-bell-slash-o");

        window.setTimeout(check_mute_time, minutesToAdd * 60000 + 1000);
    }
    //user_profile.mute_nofications_until = unmuteTime;

    exports.hide_mute_popover();
}

exports.mute_popped = function () {
    return current_stream_sidebar_elem !== undefined;
};

exports.hide_mute_popover = function () {
    if (exports.mute_popped()) {
        $(current_stream_sidebar_elem).popover("destroy");
        current_stream_sidebar_elem = undefined;
    }
};

// These are the only two functions that is really shared by the
// two popovers, so we could split out topic stuff to
// another module pretty easily.
exports.show_streamlist_sidebar = function () {
    $(".app-main .column-left").addClass("expanded");
    resize.resize_page_components();
};


exports.restore_stream_list_size = function () {
    $(".app-main .column-left").removeClass("expanded");
};

function build_mute_popover(e) {
    //console.log('build_mute_popover ' + e);
    var elt = e.target;

    if (exports.mute_popped()) {
        // If the popover is already shown, clicking again should toggle it.
        exports.hide_mute_popover();
        e.stopPropagation();
        return;
    }

    popovers.hide_all();
    exports.show_streamlist_sidebar();

    var content = templates.render(
        'mute_notifications'
    );

    $(elt).popover({
        content: content,
        trigger: "manual",
        fixed: true,
    });

    $(elt).popover("show");
    var popover = $('.mute_popover');

    current_stream_sidebar_elem = elt;
    e.stopPropagation();
}

exports.register_click_handlers = function () {
    $("#mute_notifications_icon").click(build_mute_popover);

    exports.register_mute_handlers();
};

exports.register_mute_handlers = function () {
   
    // unmute
    $('body').on('click', '.unmute', function (e) {
        console.log('Unmute Clicked');
        update_mute_setting('');
    });
    
    // 30 minute mute
    $('body').on('click', '.30_min_mute', function (e) {       
        //console.log('30 Minute Clicked');
	update_mute_setting('30m');
    });

    // 1 hour mute
    $('body').on('click', '.1_hour_mute', function (e) {
        //console.log('1 Hour Clicked');
	update_mute_setting('1h');
     });

    // 2 hour mute
    $('body').on('click', '.2_hour_mute', function (e) {
        //console.log('2 Hours Clicked');
	update_mute_setting('2h');
    });

    // 4 hour mute
    $('body').on('click', '.4_hour_mute', function (e) {
        //console.log('4 Hours Clicked');
 	update_mute_setting('4h');
    });
};

return exports;
}());

if (typeof module !== 'undefined') {
    module.exports = mute_popover;
}
