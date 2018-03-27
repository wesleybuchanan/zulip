var unread_ops = (function () {

var exports = {};

exports.mark_all_as_read = function mark_all_as_read(cont) {
    _.each(message_list.all.all_messages(), function (msg) {
        unread.set_read_flag(msg);
    });
    unread.declare_bankruptcy();
    unread_ui.update_unread_counts();

    channel.post({
        url:      '/json/mark_all_as_read',
        idempotent: true,
        success:  cont});
};

function process_newly_read_message(message, options) {
    // This code gets called when a message becomes newly read, whether
    // due to local things like advancing the pointer, or due to us
    // getting notified by the server that a message has been read.
    unread.set_read_flag(message);

    home_msg_list.show_message_as_read(message, options);
    message_list.all.show_message_as_read(message, options);
    if (message_list.narrowed) {
        message_list.narrowed.show_message_as_read(message, options);
    }
    notifications.close_notification(message);
}

exports.process_read_messages_event = function (message_ids) {
    /*
        This code has a lot in common with mark_messages_as_read,
        but there are subtle differences due to the fact that the
        server can tell us about unread messages that we didn't
        actually read locally (and which we may not have even
        loaded locally).
    */
    var options = {from: 'server'};
    var processed = false;

    _.each(message_ids, function (message_id) {
        if (!unread.id_flagged_as_unread(message_id)) {
            // Don't do anything if the message is already read.
            return;
        }

        if (current_msg_list === message_list.narrowed) {
            // I'm not sure this entirely makes sense for all server
            // notifications.
            unread.messages_read_in_narrow = true;
        }

        unread.mark_as_read(message_id);
        processed = true;

        var message = message_store.get(message_id);

        if (message) {
            process_newly_read_message(message, options);
        }
    });

    if (processed) {
        unread_ui.update_unread_counts();
    }
};


// Takes a list of messages and marks them as read
exports.mark_messages_as_read = function mark_messages_as_read(messages, options) {
    options = options || {};
    var processed = false;

    _.each(messages, function (message) {
        if (!unread.id_flagged_as_unread(message.id)) {
            // Don't do anything if the message is already read.
            return;
        }
        if (current_msg_list === message_list.narrowed) {
            unread.messages_read_in_narrow = true;
        }

        message_flags.send_read(message);
        unread.mark_as_read(message.id);
        process_newly_read_message(message, options);

        processed = true;
    });

    if (processed) {
        unread_ui.update_unread_counts();
    }
};

exports.mark_message_as_read = function mark_message_as_read(message, options) {
    exports.mark_messages_as_read([message], options);
};

// If we ever materially change the algorithm for this function, we
// may need to update notifications.received_messages as well.
exports.process_visible = function process_visible() {
    if (! notifications.window_has_focus()) {
        return;
    }

    if (feature_flags.mark_read_at_bottom) {
        if (message_viewport.bottom_message_visible()) {
            exports.mark_current_list_as_read();
        }
    } else {
        exports.mark_messages_as_read(message_viewport.visible_messages(true));
    }
};

exports.mark_current_list_as_read = function mark_current_list_as_read(options) {
    exports.mark_messages_as_read(current_msg_list.all_messages(), options);
};

exports.mark_stream_as_read = function mark_stream_as_read(stream_id, cont) {
    channel.post({
        url:      '/json/mark_stream_as_read',
        idempotent: true,
        data:     {stream_id: stream_id},
        success:  cont});
};

exports.mark_topic_as_read = function mark_topic_as_read(stream_id, topic, cont) {
    channel.post({
    url:      '/json/mark_topic_as_read',
    idempotent: true,
    data:     {stream_id: stream_id, topic_name: topic},
    success:  cont});
};


return exports;
}());
if (typeof module !== 'undefined') {
    module.exports = unread_ops;
}
