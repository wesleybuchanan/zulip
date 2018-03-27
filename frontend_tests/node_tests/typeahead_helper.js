var th = require('js/typeahead_helper.js');

set_global('page_params', {realm_is_zephyr_mirror_realm: false});
set_global('templates', {});

add_dependencies({
    stream_data: 'js/stream_data.js',
    people: 'js/people.js',
    util: 'js/util.js',
    Handlebars: 'handlebars',
    recent_senders: 'js/recent_senders.js',
    pm_conversations: 'js/pm_conversations.js',
    message_store: 'js/message_store.js',
    typeahead_helper: 'js/typeahead_helper.js',
});

stream_data.create_streams([
    {name: 'Dev', subscribed: true, color: 'blue', stream_id: 1},
    {name: 'Linux', subscribed: true, color: 'red', stream_id: 2},
]);

(function test_sort_streams() {
    var popular = {num_items: function () {
        return 10;
    }};

    var unpopular = {num_items: function () {
        return 2;
    }};

    var test_streams = [
        {name: 'Dev', pin_to_top: false, subscribers: unpopular},
        {name: 'Docs', pin_to_top: false, subscribers: popular},
        {name: 'Derp', pin_to_top: false, subscribers: unpopular},
        {name: 'Denmark', pin_to_top: true, subscribers: popular},
        {name: 'dead', pin_to_top: false, subscribers: unpopular},
    ];

    global.stream_data.is_active = function (sub) {
        return sub.name !== 'dead';
    };

    test_streams = th.sort_streams(test_streams, 'd');
    assert.deepEqual(test_streams[0].name, "Denmark"); // Pinned streams first
    assert.deepEqual(test_streams[1].name, "Docs"); // Active streams next
    assert.deepEqual(test_streams[2].name, "Derp"); // Less subscribers
    assert.deepEqual(test_streams[3].name, "Dev"); // Alphabetically last
    assert.deepEqual(test_streams[4].name, "dead"); // Inactive streams last

    // Test sort streams with description
    test_streams = [
        {name: 'Dev', description: 'development help', subscribers: unpopular},
        {name: 'Docs', description: 'writing docs', subscribers: popular},
        {name: 'Derp', description: 'derping around', subscribers: unpopular},
        {name: 'Denmark', description: 'visiting Denmark', subscribers: popular},
        {name: 'dead', description: 'dead stream', subscribers: unpopular},
    ];
    test_streams = th.sort_streams(test_streams, 'wr');
    assert.deepEqual(test_streams[0].name, "Docs"); // Description match
    assert.deepEqual(test_streams[1].name, "Denmark"); // Popular stream
    assert.deepEqual(test_streams[2].name, "Derp"); // Less subscribers
    assert.deepEqual(test_streams[3].name, "Dev"); // Alphabetically last
    assert.deepEqual(test_streams[4].name, "dead"); // Inactive streams last
}());

(function test_sort_languages() {
    set_global('pygments_data', {langs:
        {python: 40, javscript: 50, php: 38, pascal: 29, perl: 22, css: 0},
    });

    var test_langs = ["pascal", "perl", "php", "python", "javascript"];
    test_langs = th.sort_languages(test_langs, "p");

    // Sort languages by matching first letter, and then by popularity
    assert.deepEqual(test_langs, ["python", "php", "pascal", "perl", "javascript"]);

    // Test if popularity between two languages are the same
    global.pygments_data.langs.php = 40;
    test_langs = ["pascal", "perl", "php", "python", "javascript"];
    test_langs = th.sort_languages(test_langs, "p");

    assert.deepEqual(test_langs, ["php", "python", "pascal", "perl", "javascript"]);
}());

var matches = [
    {
        email: "a_bot@zulip.com",
        full_name: "A zulip test bot",
        is_admin: false,
        is_bot: true,
        user_id: 1,
    }, {
        email: "a_user@zulip.org",
        full_name: "A zulip user",
        is_admin: false,
        is_bot: false,
        user_id: 2,
    }, {
        email: "b_user_1@zulip.net",
        full_name: "Bob 1",
        is_admin: false,
        is_bot: false,
        user_id: 3,
    }, {
        email: "b_user_2@zulip.net",
        full_name: "Bob 2",
        is_admin: true,
        is_bot: false,
        user_id: 4,
    }, {
        email: "b_user_3@zulip.net",
        full_name: "Bob 3",
        is_admin: false,
        is_bot: false,
        user_id: 5,
    }, {
        email: "b_bot@example.com",
        full_name: "B bot",
        is_admin: false,
        is_bot: true,
        user_id: 6,
    }, {
        email: "zman@test.net",
        full_name: "Zman",
        is_admin: false,
        is_bot: false,
        user_id: 7,
    },
];

_.each(matches, function (person) {
    global.people.add_in_realm(person);
});

(function test_sort_recipients() {
    function get_typeahead_result(query, current_stream, current_topic) {
        var result = th.sort_recipients(
            global.people.get_realm_persons(),
            query,
            current_stream,
            current_topic
        );
        return _.map(result, function (person) {
            return person.email;
        });
    }

    // Typeahead for recipientbox [query, "", undefined]
    assert.deepEqual(get_typeahead_result("b", ""), [
        'b_user_1@zulip.net',
        'b_user_2@zulip.net',
        'b_user_3@zulip.net',
        'b_bot@example.com',
        'a_user@zulip.org',
        'zman@test.net',
        'a_bot@zulip.com',
     ]);

    // Typeahead for private message [query, "", ""]
    assert.deepEqual(get_typeahead_result("a", "", ""), [
        'a_user@zulip.org',
        'a_bot@zulip.com',
        'b_user_1@zulip.net',
        'b_user_2@zulip.net',
        'b_user_3@zulip.net',
        'zman@test.net',
        'b_bot@example.com',
     ]);

    var subscriber_email_1 = "b_user_2@zulip.net";
    var subscriber_email_2 = "b_user_3@zulip.net";
    var subscriber_email_3 = "b_bot@example.com";
    stream_data.add_subscriber("Dev", people.get_user_id(subscriber_email_1));
    stream_data.add_subscriber("Dev", people.get_user_id(subscriber_email_2));
    stream_data.add_subscriber("Dev", people.get_user_id(subscriber_email_3));

    // For spliting based on whether a PM was sent
    global.pm_conversations.set_partner(5);
    global.pm_conversations.set_partner(6);
    global.pm_conversations.set_partner(2);
    global.pm_conversations.set_partner(7);

    // For splitting based on recency
    global.recent_senders.process_message_for_senders({
        sender_id : 7,
        stream_id : 1,
        subject : "Dev Topic",
        timestamp : _.uniqueId(),
    });
    global.recent_senders.process_message_for_senders({
        sender_id : 5,
        stream_id : 1,
        subject : "Dev Topic",
        timestamp : _.uniqueId(),
    });
    global.recent_senders.process_message_for_senders({
        sender_id : 6,
        stream_id : 1,
        subject : "Dev Topic",
        timestamp : _.uniqueId(),
    });

    // Typeahead for stream message [query, stream-name, topic-name]
    assert.deepEqual(get_typeahead_result("b", "Dev", "Dev Topic"), [
        subscriber_email_3,
        subscriber_email_2,
        subscriber_email_1,
        'b_user_1@zulip.net',
        'zman@test.net',
        'a_user@zulip.org',
        'a_bot@zulip.com',
    ]);

    global.recent_senders.process_message_for_senders({
        sender_id : 5,
        stream_id : 2,
        subject : "Linux Topic",
        timestamp : _.uniqueId(),
    });
    global.recent_senders.process_message_for_senders({
        sender_id : 7,
        stream_id : 2,
        subject : "Linux Topic",
        timestamp : _.uniqueId(),
    });

    // No match
    assert.deepEqual(get_typeahead_result("h", "Linux", "Linux Topic"), [
        'zman@test.net',
        'b_user_3@zulip.net',
        'a_user@zulip.org',
        'b_bot@example.com',
        'a_bot@zulip.com',
        'b_user_1@zulip.net',
        'b_user_2@zulip.net',
    ]);

    // Test person email is "all" or "everyone"
    var person = {
        email: "all",
        full_name: "All",
        is_admin: false,
        is_bot: false,
        user_id: 42,
    };
    people.add_in_realm(person);

    assert.deepEqual(get_typeahead_result("a", "Linux", "Linux Topic"), [
        'all',
        'a_user@zulip.org',
        'a_bot@zulip.com',
        'zman@test.net',
        'b_user_3@zulip.net',
        'b_bot@example.com',
        'b_user_1@zulip.net',
        'b_user_2@zulip.net',
    ]);

    people.deactivate(person);

    // Test sort_recipients with pm counts
    matches[0].pm_recipient_count = 50;
    matches[1].pm_recipient_count = 2;
    matches[2].pm_recipient_count = 32;
    matches[3].pm_recipient_count = 42;
    matches[4].pm_recipient_count = 0;
    matches[5].pm_recipient_count = 1;

    assert.deepEqual(get_typeahead_result("b", "Linux", "Linux Topic"), [
        'b_user_3@zulip.net',
        'b_bot@example.com',
        'b_user_1@zulip.net',
        'b_user_2@zulip.net',
        'zman@test.net',
        'a_user@zulip.org',
        'a_bot@zulip.com',
    ]);

    // Test sort_recipients with duplicate people
    matches.push(matches[0]);

    var recipients = th.sort_recipients(matches, "b", "", "");
    var recipients_email = _.map(recipients, function (person) {
        return person.email;
    });
    var expected = [
        'b_bot@example.com',
        'b_user_3@zulip.net',
        'b_user_2@zulip.net',
        'b_user_1@zulip.net',
        'a_user@zulip.org',
        'zman@test.net',
        'a_bot@zulip.com',
        'a_bot@zulip.com',
    ];
    assert.deepEqual(recipients_email, expected);

    // Reset matches
    matches.splice(matches.length-1, 1);

    // full_name starts with same character but emails are 'all'
    var small_matches = [
        {
            email: "all",
            full_name: "All 1",
            is_admin: false,
            is_bot: false,
            user_id: 43,
        }, {
            email: "all",
            full_name: "All 2",
            is_admin: false,
            is_bot: false,
            user_id: 44,
        },
    ];

    recipients = th.sort_recipients(small_matches, "a", "Linux", "Linux Topic");
    recipients_email = _.map(recipients, function (person) {
        return person.email;
    });
    expected = [
        'all',
        'all',
    ];
    assert.deepEqual(recipients_email, expected);

    // matches[3] is a subscriber and matches[2] is not.
    small_matches = [matches[3], matches[2]];
    recipients = th.sort_recipients(small_matches, "b", "Dev", "Dev Topic");
    recipients_email = _.map(recipients, function (person) {
        return person.email;
    });
    expected = [
        'b_user_2@zulip.net',
        'b_user_1@zulip.net',
    ];
    assert.deepEqual(recipients_email, expected);

    // matches[4] is a pm partner and matches[3] is not and
    // both are not subscribered to the stream Linux.
    small_matches = [matches[4], matches[3]];
    recipients = th.sort_recipients(small_matches, "b", "Linux", "Linux Topic");
    recipients_email = _.map(recipients, function (person) {
        return person.email;
    });
    expected = [
        'b_user_3@zulip.net',
        'b_user_2@zulip.net',
    ];
    assert.deepEqual(recipients_email, expected);
}());

(function test_highlight_with_escaping() {
    var item = "Denmark";
    var query = "Den";
    var expected = "<strong>Den</strong>mark";
    var result = th.highlight_with_escaping(query, item);
    assert.equal(result, expected);

    item = "w3IrD_naMe";
    query = "w3IrD_naMe";
    expected = "<strong>w3IrD_naMe</strong>";
    result = th.highlight_with_escaping(query, item);
    assert.equal(result, expected);

    item = "development help";
    query = "development h";
    expected = "<strong>development h</strong>elp";
    result = th.highlight_with_escaping(query, item);
    assert.equal(result, expected);
}());

(function test_render_person() {
    // Test render_person with regular person
    var rendered = false;
    global.templates.render = function (template_name, args) {
        assert.equal(template_name, 'typeahead_list_item');
        assert.equal(args.primary, matches[1].full_name);
        assert.equal(args.secondary, matches[1].email);
        rendered = true;
        return 'typeahead-item-stub';
    };
    assert.equal(th.render_person(matches[1]), 'typeahead-item-stub');
    assert(rendered);

    // Test render_person with special_item_text person
    var special_person = {
        email: "special@example.com",
        full_name: "Special person",
        is_admin: false,
        is_bot: false,
        user_id: 7,
        special_item_text: "special_text",
    };
    rendered = false;
    global.templates.render = function (template_name, args) {
        assert.equal(template_name, 'typeahead_list_item');
        assert.equal(args.primary, special_person.special_item_text);
        rendered = true;
        return 'typeahead-item-stub';
    };
    assert.equal(th.render_person(special_person), 'typeahead-item-stub');
    assert(rendered);
}());

(function test_render_stream() {
    // Test render_stream with short description
    var rendered = false;
    var stream = {
        description: 'This is a short description.',
        stream_id: 42,
        name: 'Short Description',
    };
    global.templates.render = function (template_name, args) {
        assert.equal(template_name, 'typeahead_list_item');
        assert.equal(args.primary, stream.name);
        assert.equal(args.secondary, stream.description);
        rendered = true;
        return 'typeahead-item-stub';
    };
    assert.equal(th.render_stream(stream), 'typeahead-item-stub');
    assert(rendered);

    // Test render_stream with long description
    rendered = false;
    stream = {
        description: 'This is a very very very very very long description.',
        stream_id: 43,
        name: 'Long Description',
    };
    global.templates.render = function (template_name, args) {
        assert.equal(template_name, 'typeahead_list_item');
        assert.equal(args.primary, stream.name);
        var short_desc = stream.description.substring(0, 35);
        assert.equal(args.secondary, short_desc + "...");
        rendered = true;
        return 'typeahead-item-stub';
    };
    assert.equal(th.render_stream(stream), 'typeahead-item-stub');
    assert(rendered);
}());

(function test_render_emoji() {
    // Test render_emoji with normal emoji.
    var rendered = false;
    var emoji = {
        emoji_name: 'thumbs_up',
        codepoint: '1f44d',
    };
    set_global('emoji', {
        active_realm_emojis: {
            realm_emoji: 'TBD',
        },
    });

    global.templates.render = function (template_name, args) {
        assert.equal(template_name, 'typeahead_list_item');
        assert.deepEqual(args, {
            primary: 'thumbs up',
            codepoint: '1f44d',
            is_emoji: true,
            has_image: false,
            has_secondary: false,
        });
        rendered = true;
        return 'typeahead-item-stub';
    };
    assert.equal(th.render_emoji(emoji), 'typeahead-item-stub');
    assert(rendered);

    // Test render_emoji with normal emoji.
    rendered = false;
    emoji = {
        emoji_name: 'realm_emoji',
        emoji_url: 'TBD',
    };

    global.templates.render = function (template_name, args) {
        assert.equal(template_name, 'typeahead_list_item');
        assert.deepEqual(args, {
            primary: 'realm emoji',
            img_src: 'TBD',
            is_emoji: true,
            has_image: true,
            has_secondary: false,
        });
        rendered = true;
        return 'typeahead-item-stub';
    };
    assert.equal(th.render_emoji(emoji), 'typeahead-item-stub');
    assert(rendered);
}());

(function test_sort_emojis() {
    var emoji_list = [
        { emoji_name: '+1' },
        { emoji_name: 'thumbs_up' },
        { emoji_name: 'pig' },
        { emoji_name: 'thumbs_down' },
    ];
    assert.deepEqual(th.sort_emojis(emoji_list, 'thumbs'), [
        { emoji_name: 'thumbs_up' },
        { emoji_name: 'thumbs_down' },
        { emoji_name: '+1' },
        { emoji_name: 'pig' },
    ]);
}());

(function test_sort_recipientbox_typeahead() {
    var recipients = th.sort_recipientbox_typeahead("b, a", matches, ""); // search "a"
    var recipients_email = _.map(recipients, function (person) {
        return person.email;
    });
    assert.deepEqual(recipients_email, [
        'a_user@zulip.org', // matches "a"
        'a_bot@zulip.com', // matches "a"
        'b_bot@example.com',
        'b_user_3@zulip.net',
        'zman@test.net',
        'b_user_2@zulip.net',
        'b_user_1@zulip.net',
    ]);

    recipients = th.sort_recipientbox_typeahead("b, a, b", matches, ""); // search "b"
    recipients_email = _.map(recipients, function (person) {
        return person.email;
    });
    assert.deepEqual(recipients_email, [
        'b_bot@example.com',
        'b_user_3@zulip.net',
        'b_user_2@zulip.net',
        'b_user_1@zulip.net',
        'a_user@zulip.org',
        'zman@test.net',
        'a_bot@zulip.com',
    ]);
}());
