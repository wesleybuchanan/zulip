var ct = require('js/composebox_typeahead.js');

var emoji_stadium = {
    emoji_name: 'stadium',
    emoji_url: 'TBD',
};
var emoji_tada = {
    emoji_name: 'tada',
    emoji_url: 'TBD',
};
var emoji_moneybag = {
    emoji_name: 'moneybag',
    emoji_url: 'TBD',
};
var emoji_japanese_post_office = {
    emoji_name: 'japanese_post_office',
    emoji_url: 'TBD',
};
var emoji_panda_face = {
    emoji_name: 'panda_face',
    emoji_url: 'TBD',
};
var emoji_see_no_evil = {
    emoji_name: 'see_no_evil',
    emoji_url: 'TBD',
};
var emoji_thumbs_up = {
    emoji_name: '+1',
    emoji_url: 'TBD',
};

var emoji_list = [emoji_tada, emoji_moneybag, emoji_stadium, emoji_japanese_post_office,
                  emoji_panda_face, emoji_see_no_evil, emoji_thumbs_up];
var stream_list = ['Denmark', 'Sweden', 'The Netherlands'];
var sweden_stream = {
    name: 'Sweden',
    description: 'Cold, mountains and home decor.',
    stream_id: 1,
};
var denmark_stream = {
    name: 'Denmark',
    description: 'Vikings and boats, in a cold weather.',
    stream_id: 2,
};

set_global('$', global.make_zjquery());

set_global('page_params', {});
set_global('channel', {});

set_global('emoji', {
    active_realm_emojis: {},
    emojis: emoji_list,
});
set_global('pygments_data', {langs:
    {python: 0, javscript: 1, html: 2, css: 3},
});

add_dependencies({
    Handlebars: 'handlebars',
    compose_state: 'js/compose_state.js',
    people: 'js/people.js',
    stream_data: 'js/stream_data',
    templates: 'js/templates',
    pm_conversations: 'js/pm_conversations.js',
    recent_senders: 'js/recent_senders.js',
    typeahead_helper: 'js/typeahead_helper.js',
    ui_util: 'js/ui_util.js',
    util: 'js/util.js',
});

global.compile_template('typeahead_list_item');

stream_data.subscribed_subs = function () {
    return stream_list;
};

stream_data.subscribed_streams = function () {
    return stream_list;
};

var othello = {
    email: 'othello@zulip.com',
    user_id: 101,
    full_name: "Othello, the Moor of Venice",
};
var cordelia = {
    email: 'cordelia@zulip.com',
    user_id: 102,
    full_name: "Cordelia Lear",
};
var deactivated_user = {
    email: 'other@zulip.com',
    user_id: 103,
    full_name: "Deactivated User",
};

global.people.add_in_realm(othello);
global.people.add_in_realm(cordelia);
global.people.add(deactivated_user);

(function test_add_topic() {
    ct.add_topic('Denmark', 'civil fears');
    ct.add_topic('devel', 'fading');
    ct.add_topic('denmark', 'acceptance');
    ct.add_topic('denmark', 'Acceptance');
    ct.add_topic('Denmark', 'With Twisted Metal');

    assert.deepEqual(
        ct.topics_seen_for('Denmark'),
        ['With Twisted Metal', 'acceptance', 'civil fears']
    );
}());

(function test_topics_seen_for() {
    // Test when the stream doesn't exist (there are no topics)
    assert.deepEqual(ct.topics_seen_for('non-existing-stream'), []);
}());

(function test_content_typeahead_selected() {
    var fake_this = {
        query: '',
        $element: {},
    };
    var caret_called1 = false;
    var caret_called2 = false;
    fake_this.$element.caret = function (arg1, arg2) {
        if (arguments.length === 0) {  // .caret() used in split_at_cursor
            caret_called1 = true;
            return fake_this.query.length;
        }
        // .caret() used in setTimeout
        assert.equal(arg1, arg2);
        caret_called2 = true;
    };
    var autosize_called = false;
    set_global('compose_ui', {
        autosize_textarea: function () {
            autosize_called = true;
        },
    });
    var set_timeout_called = false;
    global.patch_builtin('setTimeout', function (f, time) {
        f();
        assert.equal(time, 0);
        set_timeout_called = true;
    });
    set_global('document', 'document-stub');

    // emoji
    fake_this.completing = 'emoji';
    fake_this.query = ':octo';
    fake_this.token = 'octo';
    var item = {
        emoji_name: 'octopus',
    };

    var actual_value = ct.content_typeahead_selected.call(fake_this, item);
    var expected_value = ':octopus: ';
    assert.equal(actual_value, expected_value);

    fake_this.query = ' :octo';
    fake_this.token = 'octo';
    actual_value = ct.content_typeahead_selected.call(fake_this, item);
    expected_value = ' :octopus: ';
    assert.equal(actual_value, expected_value);

    fake_this.query = '{:octo';
    fake_this.token = 'octo';
    actual_value = ct.content_typeahead_selected.call(fake_this, item);
    expected_value = '{ :octopus: ';
    assert.equal(actual_value, expected_value);

    // mention
    fake_this.completing = 'mention';
    var document_stub_trigger1_called = false;
    $('document-stub').trigger = function (event, params) {
        assert.equal(event, 'usermention_completed.zulip');
        assert.deepEqual(params, { mentioned: othello });
        document_stub_trigger1_called = true;
    };

    fake_this.query = '@oth';
    fake_this.token = 'oth';
    actual_value = ct.content_typeahead_selected.call(fake_this, othello);
    expected_value = '@**Othello, the Moor of Venice** ';
    assert.equal(actual_value, expected_value);

    // stream
    fake_this.completing = 'stream';
    var document_stub_trigger2_called = false;
    $('document-stub').trigger = function (event, params) {
        assert.equal(event, 'streamname_completed.zulip');
        assert.deepEqual(params, { stream: sweden_stream });
        document_stub_trigger2_called = true;
    };

    fake_this.query = '#swed';
    fake_this.token = 'swed';
    actual_value = ct.content_typeahead_selected.call(fake_this, sweden_stream);
    expected_value = '#**Sweden** ';
    assert.equal(actual_value, expected_value);

    // syntax
    fake_this.completing = 'syntax';

    fake_this.query = '~~~p';
    fake_this.token = 'p';
    actual_value = ct.content_typeahead_selected.call(fake_this, 'python');
    expected_value = '~~~python\n\n~~~';
    assert.equal(actual_value, expected_value);

    fake_this.query = '```p';
    fake_this.token = 'p';
    actual_value = ct.content_typeahead_selected.call(fake_this, 'python');
    expected_value = '```python\n\n```';
    assert.equal(actual_value, expected_value);

    // Test special case to not close code blocks if there is text afterward
    fake_this.query = '```p\nsome existing code';
    fake_this.token = 'p';
    fake_this.$element.caret = function () {
        return 4; // Put cursor right after ```p
    };
    actual_value = ct.content_typeahead_selected.call(fake_this, 'python');
    expected_value = '```python\nsome existing code';
    assert.equal(actual_value, expected_value);

    fake_this.completing = 'something-else';

    fake_this.query = 'foo';
    actual_value = ct.content_typeahead_selected.call(fake_this, {});
    expected_value = fake_this.query;
    assert.equal(actual_value, expected_value);

    assert(caret_called1);
    assert(caret_called2);
    assert(autosize_called);
    assert(set_timeout_called);
    assert(document_stub_trigger1_called);
    assert(document_stub_trigger2_called);
}());

(function test_initialize() {
    var stream_typeahead_called = false;
    $('#stream').typeahead = function (options) {
        // options.source()
        //
        // We'll search through the streams in stream_list for the streams
        // typeahead.
        var actual_value = options.source();
        var expected_value = stream_list;
        assert.deepEqual(actual_value, expected_value);

        // options.highlighter()
        options.query = 'De';  // Beginning of "Denmark", one of the streams
                               // provided in stream_list through .source().
        actual_value = options.highlighter('Denmark');
        expected_value = '<strong>Denmark</strong>';
        assert.equal(actual_value, expected_value);

        options.query = 'the n';
        actual_value = options.highlighter('The Netherlands');
        expected_value = '<strong>The Netherlands</strong>';
        assert.equal(actual_value, expected_value);

        // options.matcher()
        options.query = 'de';
        assert.equal(options.matcher('Denmark'), true);
        assert.equal(options.matcher('Sweden'), false);

        options.query = 'De';
        assert.equal(options.matcher('Denmark'), true);
        assert.equal(options.matcher('Sweden'), false);

        options.query = 'the ';
        assert.equal(options.matcher('The Netherlands'), true);
        assert.equal(options.matcher('Sweden'), false);

        stream_typeahead_called = true;
    };

    var subject_typeahead_called = false;
    $('#subject').typeahead = function (options) {
        // options.source()
        ct.add_topic('Sweden', 'furniture');
        ct.add_topic('Sweden', 'kronor');
        ct.add_topic('Sweden', 'ice');
        ct.add_topic('Sweden', 'more ice');
        ct.add_topic('Sweden', 'even more ice');
        ct.add_topic('Sweden', '<&>');
        var topics = ['<&>', 'even more ice', 'furniture', 'ice', 'kronor', 'more ice'];
        $('#stream').val('Sweden');
        var actual_value = options.source();
        // Topics should be sorted alphabetically, not by addition order.
        var expected_value = topics;
        assert.deepEqual(actual_value, expected_value);

        // options.highlighter()
        options.query = 'Kro';
        actual_value = options.highlighter('kronor');
        expected_value = '<strong>kronor</strong>';
        assert.equal(actual_value, expected_value);

        // Highlighted content should be escaped.
        options.query = '<';
        actual_value = options.highlighter('<&>');
        expected_value = '<strong>&lt;&amp;&gt;</strong>';
        assert.equal(actual_value, expected_value);

        options.query = 'even m';
        actual_value = options.highlighter('even more ice');
        expected_value = '<strong>even more ice</strong>';
        assert.equal(actual_value, expected_value);

        // options.sorter()
        //
        // Notice that alphabetical sorting isn't managed by this sorter,
        // it is a result of the topics already being sorted after adding
        // them with ct.add_topic().
        options.query = 'furniture';
        actual_value = options.sorter(['furniture']);
        expected_value = ['furniture'];
        assert.deepEqual(actual_value, expected_value);

        // A literal match at the beginning of an element puts it at the top.
        options.query = 'ice';
        actual_value = options.sorter(['even more ice', 'ice', 'more ice']);
        expected_value = ['ice', 'even more ice', 'more ice'];
        assert.deepEqual(actual_value, expected_value);

        // The sorter should return the query as the first element if there
        // isn't a topic with such name.
        // This only happens if typeahead is providing other suggestions.
        options.query = 'e';  // Letter present in "furniture" and "ice"
        actual_value = options.sorter(['furniture', 'ice']);
        expected_value = ['e', 'furniture', 'ice'];
        assert.deepEqual(actual_value, expected_value);

        // Don't make any suggestions if this query doesn't match any
        // existing topic.
        options.query = 'non-existing-topic';
        actual_value = options.sorter([]);
        expected_value = [];
        assert.deepEqual(actual_value, expected_value);

        subject_typeahead_called = true;
    };

    var pm_recipient_typeahead_called = false;
    $('#private_message_recipient').typeahead = function (options) {
        // options.source()
        //
        // This should match the users added at the beginning of this test file.
        var actual_value = options.source();
        var expected_value = [othello, cordelia, deactivated_user];
        assert.deepEqual(actual_value, expected_value);

        // options.highlighter()
        //
        // Even though the items passed to .highlighter() are the full
        // objects of the users matching the query, it only returns the
        // HTML string with the "User_name <email>" format, with the
        // corresponding parts in bold.
        options.query = 'oth';
        actual_value = options.highlighter(othello);
        expected_value = '<strong>Othello, the Moor of Venice</strong>&nbsp;&nbsp;\n<small class="autocomplete_secondary">othello@zulip.com</small>';
        assert.equal(actual_value, expected_value);

        options.query = 'Lear';
        actual_value = options.highlighter(cordelia);
        expected_value = '<strong>Cordelia Lear</strong>&nbsp;&nbsp;\n<small class="autocomplete_secondary">cordelia@zulip.com</small>';
        assert.equal(actual_value, expected_value);

        options.query = 'othello@zulip.com, co';
        actual_value = options.highlighter(cordelia);
        expected_value = '<strong>Cordelia Lear</strong>&nbsp;&nbsp;\n<small class="autocomplete_secondary">cordelia@zulip.com</small>';
        assert.equal(actual_value, expected_value);

        // options.matcher()
        options.query = 'el';  // Matches both "othELlo" and "cordELia"
        assert.equal(options.matcher(othello), true);
        assert.equal(options.matcher(cordelia), true);
        assert.equal(options.matcher(deactivated_user), false);

        // Othello is already filled in, now typeahead makes suggestions for
        // the value after the comma.
        options.query = 'othello@zulip.com, cor';
        assert.equal(options.matcher(othello), false);
        assert.equal(options.matcher(cordelia), true);
        assert.equal(options.matcher(deactivated_user), false);

        // No suggestions are made if the query is just a comma.
        options.query = ',';
        assert.equal(options.matcher(othello), false);
        assert.equal(options.matcher(cordelia), false);
        assert.equal(options.matcher(deactivated_user), false);

        options.query = 'bender';  // Doesn't exist
        assert.equal(options.matcher(othello), false);
        assert.equal(options.matcher(cordelia), false);
        assert.equal(options.matcher(deactivated_user), false);

        // Don't make suggestions if the last name only has whitespaces
        // (we're between typing names).
        options.query = 'othello@zulip.com,     ';
        assert.equal(options.matcher(othello), false);
        assert.equal(options.matcher(cordelia), false);
        assert.equal(options.matcher(deactivated_user), false);

        options.query = 'othello@zulip.com,, , cord';
        assert.equal(options.matcher(othello), false);
        assert.equal(options.matcher(cordelia), true);
        assert.equal(options.matcher(deactivated_user), false);

        // If the user is already in the list, typeahead doesn't include it
        // again.
        options.query = 'cordelia@zulip.com, cord';
        assert.equal(options.matcher(othello), false);
        assert.equal(options.matcher(cordelia), false);
        assert.equal(options.matcher(deactivated_user), false);

        // options.sorter()
        //
        // The sorter's output has the items that match the query from the
        // beginning first, and then the rest of them in REVERSE order of
        // the input.
        options.query = 'othello';
        actual_value = options.sorter([othello]);
        expected_value = [othello];
        assert.deepEqual(actual_value, expected_value);

        // A literal match at the beginning of an element puts it at the top.
        options.query = 'co';  // Matches everything ("x@zulip.COm")
        actual_value = options.sorter([othello, deactivated_user, cordelia]);
        expected_value = [cordelia, deactivated_user, othello];
        assert.deepEqual(actual_value, expected_value);

        options.query = 'non-existing-user';
        actual_value = options.sorter([]);
        expected_value = [];
        assert.deepEqual(actual_value, expected_value);

        // options.updater()
        options.query = 'othello';
        actual_value = options.updater(othello);
        expected_value = 'othello@zulip.com, ';
        assert.equal(actual_value, expected_value);

        options.query = 'othello@zulip.com, cor';
        actual_value = options.updater(cordelia);
        expected_value = 'othello@zulip.com, cordelia@zulip.com, ';
        assert.equal(actual_value, expected_value);

        var click_event = { type: 'click' };
        options.query = 'othello';
        // Focus lost (caused by the click event in the typeahead list)
        $('#private_message_recipient').blur();
        actual_value = options.updater(othello, click_event);
        expected_value = 'othello@zulip.com, ';
        assert.equal(actual_value, expected_value);
        // Check that after the click event #private_message_recipient is
        // focused.
        assert.equal($('#private_message_recipient').is_focused(), true);

        pm_recipient_typeahead_called = true;
    };

    var new_message_content_typeahead_called = false;
    $('#new_message_content').typeahead = function (options) {
        // options.source()
        //
        // For now we only test that compose_contents_begins_typeahead has been
        // properly set as the .source(). All its features are tested later on
        // in test_begins_typeahead().
        var fake_this = {
            $element: {},
        };
        var caret_called = false;
        fake_this.$element.caret = function () { caret_called = true; };
        fake_this.options = options;
        var actual_value = options.source.call(fake_this, 'test #s');
        var expected_value = stream_list;
        assert.deepEqual(actual_value, expected_value);
        assert(caret_called);

        // options.highlighter()
        //
        // Again, here we only verify that the highlighter has been set to
        // content_highlighter.
        fake_this = { completing: 'mention', token: 'othello' };
        actual_value = options.highlighter.call(fake_this, othello);
        expected_value = '<strong>Othello, the Moor of Venice</strong>&nbsp;&nbsp;\n<small class="autocomplete_secondary">othello@zulip.com</small>';
        assert.equal(actual_value, expected_value);

        // options.matcher()
        fake_this = { completing: 'emoji', token: 'ta' };
        assert.equal(options.matcher.call(fake_this, emoji_tada), true);
        assert.equal(options.matcher.call(fake_this, emoji_moneybag), false);

        fake_this = { completing: 'mention', token: 'Cord' };
        assert.equal(options.matcher.call(fake_this, cordelia), true);
        assert.equal(options.matcher.call(fake_this, othello), false);

        fake_this = { completing: 'stream', token: 'swed' };
        assert.equal(options.matcher.call(fake_this, sweden_stream), true);
        assert.equal(options.matcher.call(fake_this, denmark_stream), false);

        fake_this = { completing: 'syntax', token: 'py' };
        assert.equal(options.matcher.call(fake_this, 'python'), true);
        assert.equal(options.matcher.call(fake_this, 'javascript'), false);

        fake_this = { completing: 'non-existing-completion' };
        assert.equal(options.matcher.call(fake_this), undefined);

        // options.sorter()
        fake_this = { completing: 'emoji', token: 'ta' };
        actual_value = options.sorter.call(fake_this, [emoji_stadium, emoji_tada]);
        expected_value = [emoji_tada, emoji_stadium];
        assert.deepEqual(actual_value, expected_value);

        fake_this = { completing: 'mention', token: 'co' };
        actual_value = options.sorter.call(fake_this, [othello, cordelia]);
        expected_value = [cordelia, othello];
        assert.deepEqual(actual_value, expected_value);

        fake_this = { completing: 'stream', token: 'de' };
        actual_value = options.sorter.call(fake_this, [sweden_stream, denmark_stream]);
        expected_value = [denmark_stream, sweden_stream];
        assert.deepEqual(actual_value, expected_value);

        // Matches in the descriptions affect the order as well.
        // Testing "co" for "cold", in both streams' description. It's at the
        // beginning of Sweden's description, so that one should go first.
        fake_this = { completing: 'stream', token: 'co' };
        actual_value = options.sorter.call(fake_this, [denmark_stream, sweden_stream]);
        expected_value = [sweden_stream, denmark_stream];
        assert.deepEqual(actual_value, expected_value);

        fake_this = { completing: 'syntax', token: 'ap' };
        actual_value = options.sorter.call(fake_this, ['abap', 'applescript']);
        expected_value = ['applescript', 'abap'];
        assert.deepEqual(actual_value, expected_value);

        fake_this = { completing: 'non-existing-completion' };
        assert.equal(options.sorter.call(fake_this), undefined);

        new_message_content_typeahead_called = true;
    };

    var pm_recipient_blur_called = false;
    var old_pm_recipient_blur = $('#private_message_recipient').blur;
    $('#private_message_recipient').blur = function (handler) {
        if (handler) {  // The blur handler is being set.
            this.val('othello@zulip.com, ');
            handler.call(this);
            var actual_value = this.val();
            var expected_value = 'othello@zulip.com';
            assert.equal(actual_value, expected_value);
        } else {  // The element is simply losing the focus.
            old_pm_recipient_blur();
        }
        pm_recipient_blur_called = true;
    };

    page_params.enter_sends = false;  // We manually specify it the first
                                      // time because the click_func
                                      // doesn't exist yet.
    var noop = function () {};

    $("#stream").select(noop);
    $("#subject").select(noop);
    $("#private_message_recipient").select(noop);

    ct.initialize();

    // handle_keydown()
    var event = {
        keyCode: 13,
        target: {
            id: 'stream',
        },
        preventDefault: noop,
    };

    $('#subject').data = function () {
        return { typeahead: { shown: true }};
    };
    $('form#send_message_form').keydown(event);

    var stub_typeahead_hidden = function () {
        return { typeahead: { shown: false }};
    };
    $('#subject').data = stub_typeahead_hidden;
    $('#stream').data = stub_typeahead_hidden;
    $('#private_message_recipient').data = stub_typeahead_hidden;
    $('#new_message_content').data = stub_typeahead_hidden;
    $('form#send_message_form').keydown(event);

    event.keyCode = undefined;
    event.which = 9;
    event.shiftKey = false;
    event.target.id = 'subject';
    $('form#send_message_form').keydown(event);
    event.target.id = 'new_message_content';
    $('form#send_message_form').keydown(event);
    event.target.id = 'some_non_existing_id';
    $('form#send_message_form').keydown(event);


    // Setup jquery functions used in new_message_content enter
    // handler.
    var range_length = 0;
    $('#new_message_content').range = function () {
        return {
            length: range_length,
            range: noop,
            start: 0,
            end: 0 + range_length,
        };
    };
    $('#new_message_content').caret = noop;

    event.keyCode = 13;
    event.target.id = 'subject';
    $('form#send_message_form').keydown(event);
    event.target.id = 'new_message_content';
    page_params.enter_sends = false;
    event.metaKey = true;
    var compose_finish_called = false;
    set_global('compose', {
        finish: function () {
            compose_finish_called = true;
        },
    });
    $('form#send_message_form').keydown(event);
    assert(compose_finish_called);
    event.metaKey = false;
    event.ctrlKey = true;
    $('form#send_message_form').keydown(event);
    page_params.enter_sends = true;
    event.ctrlKey = false;
    event.altKey = true;
    $('form#send_message_form').keydown(event);

    // Cover case where there's a least one character there.
    range_length = 2;
    $('form#send_message_form').keydown(event);

    event.altKey = false;
    event.metaKey = true;
    $('form#send_message_form').keydown(event);
    event.target.id = 'private_message_recipient';
    $('form#send_message_form').keydown(event);

    event.keyCode = 42;
    $('form#send_message_form').keydown(event);

    // handle_keyup()
    event = {
        keyCode: 13,
        target: {
            id: 'stream',
        },
        preventDefault: noop,
    };
    // We execute .keydown() in order to make nextFocus !== false
    $('#subject').data = function () {
        return { typeahead: { shown: true }};
    };
    $('form#send_message_form').keydown(event);
    $('form#send_message_form').keyup(event);
    event.keyCode = undefined;
    event.which = 9;
    event.shiftKey = false;
    $('form#send_message_form').keyup(event);
    event.keyCode = 42;
    $('form#send_message_form').keyup(event);

    // select_on_focus()
    var focus_handler_called = false;
    var stream_one_called = false;
    $('#stream').focus = function (f) {
        // This .one() function emulates the possible infinite recursion that
        // in_handler tries to avoid.
        $('#stream').one = function (event, handler) {
            handler({ preventDefault: noop });
            f();  // This time in_handler will already be true.
            stream_one_called = true;
        };
        f();  // Here in_handler is false.
        focus_handler_called = true;
    };

    $("#compose-send-button").fadeOut = noop;
    $("#compose-send-button").fadeIn = noop;
    var channel_post_called = false;
    global.channel.post = function (params) {
        assert.equal(params.url, '/json/users/me/enter-sends');
        assert.equal(params.idempotent, true);
        assert.deepEqual(params.data, {enter_sends: page_params.enter_sends});

        channel_post_called = true;
    };
    $('#enter_sends').is = function () { return false; };
    $('#enter_sends').click();

    // Now we re-run both .initialize() and the click handler, this time
    // with enter_sends: page_params.enter_sends being true
    $('#enter_sends').is = function () { return true; };
    $('#enter_sends').click();
    ct.initialize();

    // Now let's make sure that all the stub functions have been called
    // during the initialization.
    assert(stream_typeahead_called);
    assert(subject_typeahead_called);
    assert(pm_recipient_typeahead_called);
    assert(pm_recipient_blur_called);
    assert(channel_post_called);
    assert(new_message_content_typeahead_called);
    assert(focus_handler_called);
    assert(stream_one_called);
}());

(function test_begins_typeahead() {
    // Stub out split_at_cursor that uses $(':focus')
    ct.split_at_cursor = function (word) { return [word, '']; };

    var begin_typehead_this = {options: {completions: {
        emoji: true, mention: true, stream: true, syntax: true}}};

    function assert_typeahead_equals(input, reference) {
        var returned = ct.compose_content_begins_typeahead.call(
            begin_typehead_this, input
        );
        assert.deepEqual(returned, reference);
    }

    var all_items = [
        {
            special_item_text: 'all (Notify everyone)',
            email: 'all',
            pm_recipient_count: Infinity,
            full_name: 'all',
        },
        {
            special_item_text: 'everyone (Notify everyone)',
            email: 'everyone',
            pm_recipient_count: Infinity,
            full_name: 'everyone',
        },
    ];

    var people_with_all = global.people.get_realm_persons().concat(all_items);
    var lang_list = Object.keys(pygments_data.langs);

    assert_typeahead_equals("test", false);
    assert_typeahead_equals("test one two", false);
    assert_typeahead_equals("*", false);
    assert_typeahead_equals("* ", false);
    assert_typeahead_equals(" *", false);
    assert_typeahead_equals("test *", false);

    // Make sure that the last token is the one we read.
    assert_typeahead_equals("~~~ @zulip", people_with_all);
    assert_typeahead_equals("@zulip :ta", emoji_list);
    assert_typeahead_equals(":tada: #foo", stream_list);
    assert_typeahead_equals("#foo\n~~~py", lang_list);

    assert_typeahead_equals("@", false);
    assert_typeahead_equals(" @", false);
    assert_typeahead_equals("test @**o", false);
    assert_typeahead_equals("test @", false);
    assert_typeahead_equals("test no@o", false);
    assert_typeahead_equals("@ ", people_with_all);
    assert_typeahead_equals("test\n@i", people_with_all);
    assert_typeahead_equals("test\n @l", people_with_all);
    assert_typeahead_equals("@zuli", people_with_all);
    assert_typeahead_equals("@ zuli", people_with_all);
    assert_typeahead_equals(" @zuli", people_with_all);
    assert_typeahead_equals("test @o", people_with_all);
    assert_typeahead_equals("test @z", people_with_all);

    assert_typeahead_equals(":", false);
    assert_typeahead_equals(": ", false);
    assert_typeahead_equals(" :", false);
    assert_typeahead_equals(":)", false);
    assert_typeahead_equals(":4", false);
    assert_typeahead_equals("test :-P", false);
    assert_typeahead_equals("hi emoji :", false);
    assert_typeahead_equals("hi emoj:i", false);
    assert_typeahead_equals("hi emoji :D", false);
    assert_typeahead_equals("hi emoji :t", emoji_list);
    assert_typeahead_equals("hi emoji :ta", emoji_list);
    assert_typeahead_equals("hi emoji :da", emoji_list);
    assert_typeahead_equals("hi emoji :da_", emoji_list);
    assert_typeahead_equals("hi emoji :da ", emoji_list);
    assert_typeahead_equals("hi emoji\n:da", emoji_list);
    assert_typeahead_equals("hi emoji\n :ra", emoji_list);
    assert_typeahead_equals(":+", emoji_list);
    assert_typeahead_equals(":la", emoji_list);
    assert_typeahead_equals(" :lee", emoji_list);
    assert_typeahead_equals("hi :see no", emoji_list);
    assert_typeahead_equals("hi :japanese post of", emoji_list);

    assert_typeahead_equals("#", false);
    assert_typeahead_equals("# ", false);
    assert_typeahead_equals(" #", false);
    assert_typeahead_equals("# s", false);
    assert_typeahead_equals("test #", false);
    assert_typeahead_equals("test # a", false);
    assert_typeahead_equals("test no#o", false);
    assert_typeahead_equals("#s", stream_list);
    assert_typeahead_equals(" #s", stream_list);
    assert_typeahead_equals("test #D", stream_list);
    assert_typeahead_equals("test #**v", stream_list);

    assert_typeahead_equals("```", false);
    assert_typeahead_equals("``` ", false);
    assert_typeahead_equals(" ```", false);
    assert_typeahead_equals("test ```", false);
    assert_typeahead_equals("test ``` py", false);
    assert_typeahead_equals("test ```a", false);
    assert_typeahead_equals("test\n```", false);
    assert_typeahead_equals("``c", false);
    assert_typeahead_equals("```b", lang_list);
    assert_typeahead_equals("``` d", lang_list);
    assert_typeahead_equals("test\n``` p", lang_list);
    assert_typeahead_equals("test\n```  p", lang_list);
    assert_typeahead_equals("~~~", false);
    assert_typeahead_equals("~~~ ", false);
    assert_typeahead_equals(" ~~~", false);
    assert_typeahead_equals(" ~~~ g", false);
    assert_typeahead_equals("test ~~~", false);
    assert_typeahead_equals("test ~~~p", false);
    assert_typeahead_equals("test\n~~~", false);
    assert_typeahead_equals("~~~e", lang_list);
    assert_typeahead_equals("~~~ f", lang_list);
    assert_typeahead_equals("test\n~~~ p", lang_list);
    assert_typeahead_equals("test\n~~~  p", lang_list);
}());

(function test_tokenizing() {
    assert.equal(ct.tokenize_compose_str("foo bar"), "");
    assert.equal(ct.tokenize_compose_str("foo#@:bar"), "");
    assert.equal(ct.tokenize_compose_str("foo bar [#alic"), "#alic");
    assert.equal(ct.tokenize_compose_str("#foo @bar [#alic"), "#alic");
    assert.equal(ct.tokenize_compose_str("foo bar #alic"), "#alic");
    assert.equal(ct.tokenize_compose_str("foo bar @alic"), "@alic");
    assert.equal(ct.tokenize_compose_str("foo bar :smil"), ":smil");
    assert.equal(ct.tokenize_compose_str(":smil"), ":smil");
    assert.equal(ct.tokenize_compose_str("foo @alice sm"), "@alice sm");
    assert.equal(ct.tokenize_compose_str("foo ```p"), "");
    assert.equal(ct.tokenize_compose_str("``` py"), "``` py");
    assert.equal(ct.tokenize_compose_str("foo``bar ~~~ py"), "");
    assert.equal(ct.tokenize_compose_str("foo ~~~why = why_not\n~~~"), "~~~");

    // The following cases are kinda judgment calls...
    assert.equal(ct.tokenize_compose_str(
        "foo @toomanycharactersisridiculoustocomplete"), "");
    assert.equal(ct.tokenize_compose_str("foo #streams@foo"), "#streams@foo");
}());

(function test_content_highlighter() {
    var fake_this = { completing: 'emoji' };
    var emoji = { emoji_name: 'person shrugging', emoji_url: '¯\_(ツ)_/¯' };
    var th_render_typeahead_item_called = false;
    typeahead_helper.render_emoji = function (item) {
        assert.deepEqual(item, emoji);
        th_render_typeahead_item_called = true;
    };
    ct.content_highlighter.call(fake_this, emoji);

    fake_this = { completing: 'mention' };
    var th_render_person_called = false;
    typeahead_helper.render_person = function (person) {
        assert.deepEqual(person, othello);
        th_render_person_called = true;
    };
    ct.content_highlighter.call(fake_this, othello);

    fake_this = { completing: 'stream' };
    var th_render_stream_called = false;
    typeahead_helper.render_stream = function (stream) {
        assert.deepEqual(stream, denmark_stream);
        th_render_stream_called = true;
    };
    ct.content_highlighter.call(fake_this, denmark_stream);

    fake_this = { completing: 'syntax' };
    th_render_typeahead_item_called = false;
    typeahead_helper.render_typeahead_item = function (item) {
        assert.deepEqual(item, { primary: 'py' });
        th_render_typeahead_item_called = true;
    };
    ct.content_highlighter.call(fake_this, 'py');

    fake_this = { completing: 'something-else' };
    assert(!ct.content_highlighter.call(fake_this));

    // Verify that all stub functions have been called.
    assert(th_render_typeahead_item_called);
    assert(th_render_person_called);
    assert(th_render_stream_called);
    assert(th_render_typeahead_item_called);
}());

(function test_typeahead_results() {
    function compose_typeahead_results(completing,items,token) {
        // items -> emoji array, token -> simulates text in input
        var matcher = ct.compose_content_matcher.bind({completing: completing, token: token});
        var sorter = ct.compose_matches_sorter.bind({completing: completing, token: token});
        var matches = [];
        _.each(items, function (item) {
            if (matcher(item)) {
                matches.push(item);
            }
        });
        var sorted_matches = sorter(matches);
        return sorted_matches;
    }

    function assert_emoji_matches(input, expected) {
        var returned = compose_typeahead_results('emoji', emoji_list, input);
        assert.deepEqual(returned, expected);
    }

    assert_emoji_matches('da',[{emoji_name: "tada", emoji_url: "TBD"},
        {emoji_name: "panda_face", emoji_url: "TBD"}]);
    assert_emoji_matches('da_', [{emoji_name: "panda_face", emoji_url: "TBD"}]);
    assert_emoji_matches('da ', [{emoji_name: "panda_face", emoji_url: "TBD"}]);
    assert_emoji_matches('japanese_post_', [{emoji_name: "japanese_post_office", emoji_url: "TBD"}]);
    assert_emoji_matches('japanese post ', [{emoji_name: "japanese_post_office", emoji_url: "TBD"}]);
    assert_emoji_matches('notaemoji', []);
}());
