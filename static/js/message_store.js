var message_store = (function () {

var exports = {};
var stored_messages = {};

exports.recent_private_messages = [];

exports.get = function get(message_id) {
    return stored_messages[message_id];
};

exports.get_pm_emails = function (message) {

    function email(user_id) {
        var person = people.get_person_from_user_id(user_id);
        if (!person) {
            blueslip.error('Unknown user id ' + user_id);
            return '?';
        }
        return person.email;
    }

    var user_ids = people.pm_with_user_ids(message);
    var emails = _.map(user_ids, email).sort();

    return emails.join(', ');
};

exports.get_pm_full_names = function (message) {

    function name(user_id) {
        var person = people.get_person_from_user_id(user_id);
        if (!person) {
            blueslip.error('Unknown user id ' + user_id);
            return '?';
        }
        return person.full_name;
    }

    var user_ids = people.pm_with_user_ids(message);
    var names = _.map(user_ids, name).sort();

    return names.join(', ');
};

exports.process_message_for_recent_private_messages = function (message) {
    var user_ids = people.pm_with_user_ids(message);
    if (!user_ids) {
        return;
    }

    _.each(user_ids, function (user_id) {
        pm_conversations.set_partner(user_id);
    });

    var user_ids_string = user_ids.join(',');

    exports.insert_recent_private_message(user_ids_string, message.timestamp);
};

exports.insert_recent_private_message = (function () {
    var recent_timestamps = new Dict({fold_case: true}); // key is user_ids_string

    return function (user_ids_string, timestamp) {
        var conversation = recent_timestamps.get(user_ids_string);

        if (conversation === undefined) {
            // This is a new user, so create a new object.
            conversation = {
                user_ids_string: user_ids_string,
                timestamp: timestamp,
            };
            recent_timestamps.set(user_ids_string, conversation);

            // Optimistically insert the new message at the front, since that
            // is usually where it belongs, but we'll re-sort.
            exports.recent_private_messages.unshift(conversation);
        } else {
            if (conversation.timestamp >= timestamp) {
                return; // don't backdate our conversation
            }

            // update our timestamp
            conversation.timestamp = timestamp;
        }

        exports.recent_private_messages.sort(function (a, b) {
            return b.timestamp - a.timestamp;
        });
    };
}());

exports.set_message_booleans = function (message, flags) {
    function convert_flag(flag_name) {
        return flags.indexOf(flag_name) >= 0;
    }

    message.unread = !convert_flag('read');
    message.historical = convert_flag('historical');
    message.starred = convert_flag('starred');
    message.mentioned = convert_flag('mentioned') || convert_flag('wildcard_mentioned');
    message.mentioned_me_directly =  convert_flag('mentioned');
    message.collapsed = convert_flag('collapsed');
    message.alerted = convert_flag('has_alert_word');
};

exports.add_message_metadata = function (message) {
    var cached_msg = stored_messages[message.id];
    if (cached_msg !== undefined) {
        // Copy the match subject and content over if they exist on
        // the new message
        if (message.match_subject !== undefined) {
            cached_msg.match_subject = message.match_subject;
            cached_msg.match_content = message.match_content;
        }
        return cached_msg;
    }

    message.sent_by_me = people.is_current_user(message.sender_email);

    message.flags = message.flags || [];

    exports.set_message_booleans(message, message.flags);

    people.extract_people_from_message(message);

    var sender = people.get_person_from_user_id(message.sender_id);
    if (sender) {
        message.sender_full_name = sender.full_name;
        message.sender_email = sender.email;
    }

    switch (message.type) {
    case 'stream':
        message.is_stream = true;
        message.stream = message.display_recipient;
        composebox_typeahead.add_topic(message.stream, message.subject);
        message.reply_to = message.sender_email;

        topic_data.add_message({
            stream_id: message.stream_id,
            topic_name: message.subject,
            message_id: message.id,
        });

        recent_senders.process_message_for_senders(message);
        break;

    case 'private':
        message.is_private = true;
        message.reply_to = util.normalize_recipients(
                exports.get_pm_emails(message));
        message.display_reply_to = exports.get_pm_full_names(message);
        message.pm_with_url = people.pm_with_url(message);
        message.to_user_ids = people.pm_reply_user_string(message);

        exports.process_message_for_recent_private_messages(message);
        break;
    }

    alert_words.process_message(message);
    if (!message.reactions) {
        message.reactions = [];
    }
    stored_messages[message.id] = message;
    return message;
};

exports.reify_message_id = function (opts) {
    var old_id = opts.old_id;
    var new_id = opts.new_id;
    if (pointer.furthest_read === old_id) {
        pointer.furthest_read = new_id;
    }
    if (stored_messages[old_id]) {
        stored_messages[new_id] = stored_messages[old_id];
        delete stored_messages[old_id];
    }

    _.each([message_list.all, home_msg_list, message_list.narrowed], function (msg_list) {
        if (msg_list !== undefined) {
            msg_list.change_message_id(old_id, new_id);

            if (msg_list.view !== undefined) {
                msg_list.view.change_message_id(old_id, new_id);
            }
        }
    });
};

return exports;

}());
if (typeof module !== 'undefined') {
    module.exports = message_store;
}
