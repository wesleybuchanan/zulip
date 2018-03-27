var popovers = (function () {

var exports = {};

var current_actions_popover_elem;
var current_message_info_popover_elem;
var userlist_placement = "right";

var list_of_popovers = [];

// this utilizes the proxy pattern to intercept all calls to $.fn.popover
// and push the $.fn.data($o, "popover") results to an array.
// this is needed so that when we try to unload popovers, we can kill all dead
// ones that no longer have valid parents in the DOM.
(function (popover) {

    $.fn.popover = function () {
        // apply the jQuery object as `this`, and popover function arguments.
        popover.apply(this, arguments);

        // if there is a valid "popover" key in the jQuery data object then
        // push it to the array.
        if (this.data("popover")) {
            list_of_popovers.push(this.data("popover"));
        }
    };

    // add back all shallow properties of $.fn.popover to the new proxied version.
    for (var x in popover) {
        if (popover.hasOwnProperty(x)) {
            $.fn.popover[x] = popover[x];
        }
    }
}($.fn.popover));

function load_medium_avatar(user, elt) {
    var user_avatar_url = "avatar/" + user.user_id + "/medium";
    var sender_avatar_medium = new Image();
    sender_avatar_medium.src = user_avatar_url;
    $(sender_avatar_medium).on("load", function () {
        elt.css("background-image", "url(" + $(this).attr("src") + ")");
    });
}

function user_last_seen_time_status(user_id) {
    var status = presence.get_status(user_id);
    if (status === "active") {
        return i18n.t("Active now");
    }

    if (page_params.realm_is_zephyr_mirror_realm) {
        // We don't send presence data to clients in Zephyr mirroring realms
        return i18n.t("Unknown");
    }

    // There are situations where the client has incomplete presence
    // history on a user.  This can happen when users are deactivated,
    // or when they just haven't been present in a long time (and we
    // may have queries on presence that go back only N weeks).
    //
    // We give the somewhat vague status of "Unknown" for these users.
    var last_active_date = presence.last_active_date(user_id);
    if (last_active_date === undefined) {
        return i18n.t("Unknown");
    }
    return timerender.last_seen_status_from_date(last_active_date.clone());
}

// element is the target element to pop off of
// user is the user whose profile to show
// message is the message containing it, which should be selected
function show_user_info_popover(element, user, message) {
    var last_popover_elem = current_message_info_popover_elem;
    popovers.hide_all();
    if (last_popover_elem !== undefined
        && last_popover_elem.get()[0] === element) {
        // We want it to be the case that a user can dismiss a popover
        // by clicking on the same element that caused the popover.
        return;
    }
    current_msg_list.select_id(message.id);
    var elt = $(element);
    if (elt.data('popover') === undefined) {
        if (user === undefined) {
            // This case should not happen, because
            // people.extract_people_from_message should have added
            // the message sender to the people.js data set.
            blueslip.error('Bad sender in message' + message.sender_id);
            return;
        }

        var args = {
            user_full_name: user.full_name,
            user_email: user.email,
            user_id: user.user_id,
            user_time: people.get_user_time(user.user_id),
            presence_status: presence.get_status(user.user_id),
            user_last_seen_time_status: user_last_seen_time_status(user.user_id),
            pm_with_uri: narrow.pm_with_uri(user.email),
            sent_by_uri: narrow.by_sender_uri(user.email),
            narrowed: narrow_state.active(),
            private_message_class: "respond_personal_button",
            is_active: people.realm_user_is_active_human_or_bot(user.user_id),
        };

        var ypos = elt.offset().top;
        var popover_size = 428;
        var placement = "right";

        if (!((ypos + (popover_size / 2) < message_viewport.height()) &&
            (ypos > (popover_size / 2)))) {
            if (((ypos + popover_size) < message_viewport.height())) {
                placement = "bottom";
            } else if (ypos > popover_size) {
                placement = "top";
            }
        }

        elt.popover({
            placement: placement,
            template: templates.render('user_info_popover', {class: "message-info-popover"}),
            title: templates.render('user_info_popover_title',
                                    {user_avatar: "avatar/" + user.email}),
            content: templates.render('user_info_popover_content', args),
            trigger: "manual",
        });
        elt.popover("show");

        load_medium_avatar(user, $(".popover-avatar"));

        current_message_info_popover_elem = elt;
    }
}

exports.toggle_actions_popover = function (element, id) {
    var last_popover_elem = current_actions_popover_elem;
    popovers.hide_all();
    if (last_popover_elem !== undefined
        && last_popover_elem.get()[0] === element) {
        // We want it to be the case that a user can dismiss a popover
        // by clicking on the same element that caused the popover.
        return;
    }

    $(element).closest('.message_row').toggleClass('has_popover has_actions_popover');
    current_msg_list.select_id(id);
    var elt = $(element);
    if (elt.data('popover') === undefined) {
        var message = current_msg_list.get(id);
        var editability = message_edit.get_editability(message);
        var use_edit_icon;
        var editability_menu_item;
        if (editability === message_edit.editability_types.FULL) {
            use_edit_icon = true;
            editability_menu_item = i18n.t("Edit");
        } else if (editability === message_edit.editability_types.TOPIC_ONLY) {
            use_edit_icon = false;
            editability_menu_item = i18n.t("View source / Edit topic");
        } else {
            use_edit_icon = false;
            editability_menu_item = i18n.t("View source");
        }
        var can_mute_topic =
                message.stream &&
                message.subject &&
                !muting.is_topic_muted(message.stream, message.subject);
        var can_unmute_topic =
                message.stream &&
                message.subject &&
                muting.is_topic_muted(message.stream, message.subject);

        var should_display_edit_history_option = _.any(message.edit_history, function (entry) {
            return entry.prev_content !== undefined;
        }) && page_params.realm_allow_edit_history;
        var should_display_delete_option = page_params.is_admin;
        var args = {
            message: message,
            use_edit_icon: use_edit_icon,
            editability_menu_item: editability_menu_item,
            can_mute_topic: can_mute_topic,
            can_unmute_topic: can_unmute_topic,
            should_display_add_reaction_option: message.sent_by_me,
            should_display_edit_history_option: should_display_edit_history_option,
            conversation_time_uri: narrow.by_conversation_and_time_uri(message, true),
            narrowed: narrow_state.active(),
            should_display_delete_option: should_display_delete_option,
        };

        var ypos = elt.offset().top;
        elt.popover({
            // Popover height with 7 items in it is ~190 px
            placement: ((message_viewport.height() - ypos) < 220) ? 'top' : 'bottom',
            title:     "",
            content:   templates.render('actions_popover_content', args),
            trigger:   "manual",
        });
        elt.popover("show");
        current_actions_popover_elem = elt;
    }
};

function get_action_menu_menu_items() {
    if (!current_actions_popover_elem) {
        blueslip.error('Trying to get menu items when action popover is closed.');
        return;
    }

    var popover_data = current_actions_popover_elem.data('popover');
    if (!popover_data) {
        blueslip.error('Cannot find popover data for actions menu.');
        return;
    }

    return $('li:not(.divider):visible a', popover_data.$tip);
}

function focus_first_action_popover_item() {
    // For now I recommend only calling this when the user opens the menu with a hotkey.
    // Our popup menus act kind of funny when you mix keyboard and mouse.
    var items = get_action_menu_menu_items();
    if (!items) {
        return;
    }

    items.eq(0).expectOne().focus();
}

exports.open_message_menu = function () {
    var id = current_msg_list.selected_id();
    popovers.toggle_actions_popover($(".selected_message .actions_hover")[0], id);
    if (current_actions_popover_elem) {
        focus_first_action_popover_item();
    }
    return true;
};

exports.actions_menu_handle_keyboard = function (key) {
    var items = get_action_menu_menu_items();
    if (!items) {
        return;
    }

    var index = items.index(items.filter(':focus'));

    if (key === "enter" && index >= 0 && index < items.length) {
        return items[index].click();
    }
    if (index === -1) {
        index = 0;
    } else if ((key === 'down_arrow' || key === 'vim_down') && index < items.length - 1) {
        index += 1;
    } else if ((key === 'up_arrow' || key === 'vim_up') && index > 0) {
        index -= 1;
    }
    items.eq(index).focus();
};

exports.actions_popped = function () {
    return current_actions_popover_elem !== undefined;
};

exports.hide_actions_popover = function () {
    if (popovers.actions_popped()) {
        $('.has_popover').removeClass('has_popover has_actions_popover');
        current_actions_popover_elem.popover("destroy");
        current_actions_popover_elem = undefined;
    }
};

function message_info_popped() {
    return current_message_info_popover_elem !== undefined;
}

exports.hide_message_info_popover = function () {
    if (message_info_popped()) {
        current_message_info_popover_elem.popover("destroy");
        current_message_info_popover_elem = undefined;
    }
};

exports.hide_userlist_sidebar = function () {
    $(".app-main .column-right").removeClass("expanded");
};

exports.hide_pm_list_sidebar = function () {
    $(".app-main .column-left").removeClass("expanded");
};

exports.show_userlist_sidebar = function () {
    $(".app-main .column-right").addClass("expanded");
    resize.resize_page_components();
};

exports.show_pm_list_sidebar = function () {
    $(".app-main .column-left").addClass("expanded");
    resize.resize_page_components();
};

var current_user_sidebar_user_id;
var current_user_sidebar_popover;

function user_sidebar_popped() {
    return current_user_sidebar_popover !== undefined;
}

exports.hide_user_sidebar_popover = function () {
    if (user_sidebar_popped()) {
        // this hide_* method looks different from all the others since
        // the presence list may be redrawn. Due to funkiness with jquery's .data()
        // this would confuse $.popover("destroy"), which looks at the .data() attached
        // to a certain element. We thus save off the .data("popover") in the
        // show_user_sidebar_popover and inject it here before calling destroy.
        $('#user_presences').data("popover", current_user_sidebar_popover);
        $('#user_presences').popover("destroy");
        current_user_sidebar_user_id = undefined;
        current_user_sidebar_popover = undefined;
    }
};

exports.show_sender_info = function () {
    var $message = $(".selected_message");
    var $sender = $message.find(".sender_info_hover");
    var $prev_message = $message.prev();
    while (!$sender[0]) {
        $prev_message = $prev_message.prev();
        if (!$prev_message) {
            break;
        }
        $sender = $prev_message.find(".sender_info_hover");
    }
    var message = current_msg_list.get(rows.id($message));
    var user = people.get_person_from_user_id(message.sender_id);
    show_user_info_popover($sender[0], user, message);
};

exports.register_click_handlers = function () {
    $("#main_div").on("click", ".actions_hover", function (e) {
        var row = $(this).closest(".message_row");
        e.stopPropagation();
        popovers.toggle_actions_popover(this, rows.id(row));
    });

    $("#main_div").on("click", ".sender_info_hover", function (e) {
        var row = $(this).closest(".message_row");
        e.stopPropagation();
        var message = current_msg_list.get(rows.id(row));
        var user = people.get_person_from_user_id(message.sender_id);
        show_user_info_popover(this, user, message);
    });

    $('body').on('click', '.user_popover .narrow_to_private_messages', function (e) {
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        var email = people.get_person_from_user_id(user_id).email;

        popovers.hide_user_sidebar_popover();
        narrow.by('pm-with', email, {select_first_unread: true, trigger: 'user sidebar popover'});
        e.stopPropagation();
    });

    $('body').on('click', '.user_popover .narrow_to_messages_sent', function (e) {
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        var email = people.get_person_from_user_id(user_id).email;

        popovers.hide_user_sidebar_popover();
        narrow.by('sender', email, {select_first_unread: true, trigger: 'user sidebar popover'});
        e.stopPropagation();
    });

    $('body').on('click', '.user_popover .compose_private_message', function (e) {
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        var email = people.get_person_from_user_id(user_id).email;
        popovers.hide_user_sidebar_popover();

        compose_actions.start('private', {private_message_recipient: email, trigger: 'sidebar user actions'});
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.user_popover .mention_user', function (e) {
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        compose_actions.start('stream', {trigger: 'sidebar user actions'});
        var name = people.get_person_from_user_id(user_id).full_name;
        var textarea = $("#new_message_content");
        textarea.val('@**' + name + '** ');
        popovers.hide_user_sidebar_popover();
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.sender_info_popover .narrow_to_private_messages', function (e) {
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        var email = people.get_person_from_user_id(user_id).email;
        narrow.by('pm-with', email, {select_first_unread: true, trigger: 'user sidebar popover'});
        popovers.hide_message_info_popover();
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.sender_info_popover .narrow_to_messages_sent', function (e) {
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        var email = people.get_person_from_user_id(user_id).email;
        narrow.by('sender', email, {select_first_unread: true, trigger: 'user sidebar popover'});
        popovers.hide_message_info_popover();
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.sender_info_popover .mention_user', function (e) {
        compose_actions.respond_to_message({trigger: 'user sidebar popover'});
        var user_id = $(e.target).parents('ul').attr('data-user-id');
        var name = people.get_person_from_user_id(user_id).full_name;
        var textarea = $("#new_message_content");
        textarea.val('@**' + name + '** ');
        popovers.hide_message_info_popover();
        e.stopPropagation();
        e.preventDefault();
    });

    $('#user_presences').on('click', 'span.arrow', function (e) {
        e.stopPropagation();

        // use email of currently selected user, rather than some elem comparison,
        // as the presence list may be redrawn with new elements.
        var target = $(this).closest('li');
        var user_id = target.find('a').attr('data-user-id');

        if (current_user_sidebar_user_id === user_id) {
            // If the popover is already shown, clicking again should toggle it.
            popovers.hide_all();
            return;
        }
        popovers.hide_all();

        if (userlist_placement === "right") {
            popovers.show_userlist_sidebar();
        }

        var user = people.get_person_from_user_id(user_id);
        var user_email = user.email;

        var args = {
            user_email: user_email,
            user_full_name: user.full_name,
            user_id: user_id,
            user_time: people.get_user_time(user_id),
            presence_status: presence.get_status(user_id),
            user_last_seen_time_status: user_last_seen_time_status(user_id),
            pm_with_uri: narrow.pm_with_uri(user_email),
            sent_by_uri: narrow.by_sender_uri(user_email),
            private_message_class: "compose_private_message",
            is_active: people.realm_user_is_active_human_or_bot(user_id),
        };

        target.popover({
            template: templates.render('user_info_popover', {class: "user_popover"}),
            title: templates.render('user_info_popover_title', {user_avatar: "avatar/" + user_email}),
            content: templates.render('user_info_popover_content', args),
            trigger: "manual",
            fixed: true,
            placement: userlist_placement === "left" ? "right" : "left",
        });
        target.popover("show");

        load_medium_avatar(user, $(".popover-avatar"));

        current_user_sidebar_user_id = user_id;
        current_user_sidebar_popover = target.data('popover');

    });

    $('body').on('click', '.respond_button', function (e) {
        var textarea = $("#new_message_content");
        var msgid = $(e.currentTarget).data("message-id");

        compose_actions.respond_to_message({trigger: 'popover respond'});
        channel.get({
            url: '/json/messages/' + msgid,
            idempotent: true,
            success: function (data) {
                if (textarea.val() === "") {
                    textarea.val("```quote\n" + data.raw_content +"\n```\n");
                } else {
                    textarea.val(textarea.val() + "\n```quote\n" + data.raw_content +"\n```\n");
                }
                $("#new_message_content").trigger("autosize.resize");
            },
        });
        popovers.hide_actions_popover();
        e.stopPropagation();
        e.preventDefault();
    });
    $('body').on('click', '.respond_personal_button', function (e) {
        compose_actions.respond_to_message({reply_type: 'personal', trigger: 'popover respond pm'});
        popovers.hide_all();
        e.stopPropagation();
        e.preventDefault();
    });
    $('body').on('click', '.popover_toggle_collapse', function (e) {
        var msgid = $(e.currentTarget).data('message-id');
        var row = current_msg_list.get_row(msgid);
        var message = current_msg_list.get(rows.id(row));

        popovers.hide_actions_popover();

        if (row) {
            if (message.collapsed) {
                condense.uncollapse(row);
            } else {
                condense.collapse(row);
            }
        }

        e.stopPropagation();
        e.preventDefault();
    });
    $('body').on('click', '.popover_edit_message', function (e) {
        var msgid = $(e.currentTarget).data('message-id');
        var row = current_msg_list.get_row(msgid);
        popovers.hide_actions_popover();
        message_edit.start(row);
        e.stopPropagation();
        e.preventDefault();
    });
    $('body').on('click', '.view_edit_history', function (e) {
        var msgid = $(e.currentTarget).data('msgid');
        var row = current_msg_list.get_row(msgid);
        var message = current_msg_list.get(rows.id(row));
        var message_history_cancel_btn = $('#message-history-cancel');

        popovers.hide_actions_popover();
        message_edit.show_history(message);
        message_history_cancel_btn.focus();
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.popover_mute_topic', function (e) {
        var stream = $(e.currentTarget).data('msg-stream');
        var topic = $(e.currentTarget).data('msg-topic');
        popovers.hide_actions_popover();
        muting_ui.mute(stream, topic);
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.popover_unmute_topic', function (e) {
        var stream = $(e.currentTarget).data('msg-stream');
        var topic = $(e.currentTarget).data('msg-topic');
        popovers.hide_actions_popover();
        muting_ui.unmute(stream, topic);
        e.stopPropagation();
        e.preventDefault();
    });

    $('body').on('click', '.delete_message', function (e) {
        var msgid = $(e.currentTarget).data('message-id');
        popovers.hide_actions_popover();
        message_edit.delete_message(msgid);
        e.stopPropagation();
        e.preventDefault();
    });

    new Clipboard('.copy_link');

    $('body').on('click', '.copy_link', function (e) {
        popovers.hide_actions_popover();
        var id = $(this).attr("data-message-id");
        var row = $("[zid='" + id + "']");
        row.find(".alert-copied")
            .css("display", "block")
            .delay(1000).fadeOut(300);

        setTimeout(function () {
            // The Cliboard library works by focusing to a hidden textarea.
            // We unfocus this so keyboard shortcuts, etc., will work again.
            $(":focus").blur();
        }, 0);

        e.stopPropagation();
        e.preventDefault();
    });

    (function () {
        var last_scroll = 0;

        $('.app').on('scroll', function () {
            var date = new Date().getTime();

            // only run `popovers.hide_all()` if the last scroll was more
            // than 250ms ago.
            if (date - last_scroll > 250) {
                popovers.hide_all();
            }

            // update the scroll time on every event to make sure it doesn't
            // retrigger `hide_all` while still scrolling.
            last_scroll = date;
        });
    }());

};

exports.any_active = function () {
    // True if any popover (that this module manages) is currently shown.
    return popovers.actions_popped() || user_sidebar_popped() ||
        stream_popover.stream_popped() || stream_popover.topic_popped() ||
        message_info_popped() || emoji_picker.reactions_popped();
};

exports.hide_all = function () {
    $('.has_popover').removeClass('has_popover has_actions_popover has_emoji_popover');
    popovers.hide_actions_popover();
    popovers.hide_message_info_popover();
    emoji_picker.hide_emoji_popover();
    stream_popover.hide_stream_popover();
    stream_popover.hide_topic_popover();
    popovers.hide_user_sidebar_popover();
    popovers.hide_userlist_sidebar();
    stream_popover.restore_stream_list_size();

    // look through all the popovers that have been added and removed.
    list_of_popovers.forEach(function ($o) {
        if (!document.body.contains($o.$element[0]) && $o.$tip) {
            $o.$tip.remove();
        }
    });
};

exports.set_userlist_placement = function (placement) {
    userlist_placement = placement || "right";
};

exports.compute_placement = function (elt, popover_height, popover_width,
                                      prefer_vertical_positioning) {
    var client_rect = elt.get(0).getBoundingClientRect();
    var distance_from_top = client_rect.top;
    var distance_from_bottom = message_viewport.height() - client_rect.bottom;
    var distance_from_left = client_rect.left;
    var distance_from_right = message_viewport.width() - client_rect.right;

    var elt_will_fit_horizontally =
        distance_from_left + elt.width() / 2 > popover_width / 2 &&
        distance_from_right + elt.width() / 2 > popover_width / 2;

    var elt_will_fit_vertically =
        distance_from_bottom + elt.height() / 2 > popover_height / 2 &&
        distance_from_top + elt.height() / 2 > popover_height / 2;

    // default to placing the popover in the center of the screen
    var placement = 'viewport_center';

    // prioritize left/right over top/bottom
    if (distance_from_top > popover_height && elt_will_fit_horizontally) {
        placement = 'top';
    }
    if (distance_from_bottom > popover_height && elt_will_fit_horizontally) {
        placement = 'bottom';
    }

    if (prefer_vertical_positioning && placement !== 'viewport_center') {
        // If vertical positioning is prefered and the popover fits in
        // either top or bottom position then return.
        return placement;
    }

    if (distance_from_left > popover_width && elt_will_fit_vertically) {
        placement = 'left';
    }
    if (distance_from_right > popover_width && elt_will_fit_vertically) {
        placement = 'right';
    }

    return placement;
};

return exports;
}());

if (typeof module !== 'undefined') {
    module.exports = popovers;
}
