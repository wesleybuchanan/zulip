/*global Dict */
var path = require('path');
var fs = require('fs');

set_global('window', {
    location: {
        origin: 'http://zulip.zulipdev.com',
    },
});

set_global('page_params', {
    realm_users: [],
    realm_emoji: {
        burrito: {display_url: '/static/generated/emoji/images/emoji/burrito.png',
                  source_url: '/static/generated/emoji/images/emoji/burrito.png'},
    },
    realm_filters: [
        [
            "#(?P<id>[0-9]{2,8})",
            "https://trac.zulip.net/ticket/%(id)s",
        ],
        [
            "ZBUG_(?P<id>[0-9]{2,8})",
            "https://trac2.zulip.net/ticket/%(id)s",
        ],
        [
            "ZGROUP_(?P<id>[0-9]{2,8}):(?P<zone>[0-9]{1,8})",
            "https://zone_%(zone)s.zulip.net/ticket/%(id)s",
        ],
    ],
});

set_global('blueslip', {});

add_dependencies({
    marked: 'third/marked/lib/marked.js',
    emoji_codes: 'generated/emoji/emoji_codes.js',
    emoji: 'js/emoji.js',
    people: 'js/people.js',
    stream_data: 'js/stream_data.js',
    hash_util: 'js/hash_util',
    fenced_code: 'js/fenced_code.js',
    katex: 'node_modules/katex/dist/katex.min.js',
    util: 'js/util.js',
});

set_global('Image', function () {
  return {};
});
emoji.initialize();

var doc = "";
set_global('document', doc);

set_global('$', global.make_zjquery());

set_global('feature_flags', {local_echo: true});

var people = global.people;

var cordelia = {
    full_name: 'Cordelia Lear',
    user_id: 101,
    email: 'cordelia@zulip.com',
};
people.add(cordelia);

people.add({
    full_name: 'Leo',
    user_id: 102,
    email: 'leo@zulip.com',
});

people.initialize_current_user(cordelia.user_id);

var stream_data = global.stream_data;
var denmark = {
    subscribed: false,
    color: 'blue',
    name: 'Denmark',
    stream_id: 1,
    in_home_view: false,
};
var social = {
    subscribed: true,
    color: 'red',
    name: 'social',
    stream_id: 2,
    in_home_view: true,
    invite_only: true,
};
stream_data.add_sub('Denmark', denmark);
stream_data.add_sub('social', social);

// Check the default behavior of fenced code blocks
// works properly before markdown is initialized.
(function test_fenced_block_defaults() {
    var input = '\n```\nfenced code\n```\n\nand then after\n';
    var expected = '\n\n<div class="codehilite"><pre><span></span>fenced code\n</pre></div>\n\n\n\nand then after\n\n';
    var output = fenced_code.process_fenced_code(input);
    assert.equal(output, expected);
}());

var markdown = require('js/markdown.js');

markdown.initialize();

var bugdown_data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../zerver/fixtures/markdown_test_cases.json'), 'utf8', 'r'));

(function test_bugdown_detection() {

    var no_markup = [
                     "This is a plaintext message",
                     "This is a plaintext: message",
                     "This is a :plaintext message",
                     "This is a :plaintext message: message",
                     "Contains a not an image.jpeg/ok file",
                     "Contains a not an http://www.google.com/ok/image.png/stop file",
                     "No png to be found here, a png",
                     "No user mention **leo**",
                     "No user mention @what there",
                     "We like to code\n~~~\ndef code():\n    we = \"like to do\"\n~~~",
                     "This is a\nmultiline :emoji: here\n message",
                     "This is an :emoji: message",
                     "User Mention @**leo**",
                     "User Mention @**leo f**",
                     "User Mention @**leo with some name**",
                     "Stream #**Verona**",
                     "This contains !gravatar(leo@zulip.com)",
                     "And an avatar !avatar(leo@zulip.com) is here",
                    ];

    var markup = [
                   "Contains a https://zulip.com/image.png file",
                   "Contains a https://zulip.com/image.jpg file",
                   "https://zulip.com/image.jpg",
                   "also https://zulip.com/image.jpg",
                   "https://zulip.com/image.jpg too",
                   "Contains a zulip.com/foo.jpeg file",
                   "Contains a https://zulip.com/image.png file",
                   "twitter url https://twitter.com/jacobian/status/407886996565016579",
                   "https://twitter.com/jacobian/status/407886996565016579",
                   "then https://twitter.com/jacobian/status/407886996565016579",
                   "twitter url http://twitter.com/jacobian/status/407886996565016579",
                   "youtube url https://www.youtube.com/watch?v=HHZ8iqswiCw&feature=youtu.be&a",
                 ];

    no_markup.forEach(function (content) {
        assert.equal(markdown.contains_backend_only_syntax(content), false);
    });

    markup.forEach(function (content) {
        assert.equal(markdown.contains_backend_only_syntax(content), true);
    });
}());

(function test_marked_shared() {
    var tests = bugdown_data.regular_tests;
    tests.forEach(function (test) {
        var message = {raw_content: test.input};
        markdown.apply_markdown(message);
        var output = message.content;

        if (test.marked_expected_output) {
            assert.notEqual(test.expected_output, output);
            assert.equal(test.marked_expected_output, output);
        } else if (test.backend_only_rendering) {
            assert.equal(markdown.contains_backend_only_syntax(test.input), true);
        } else if (test.bugdown_matches_marked) {
            assert.equal(test.expected_output, output);
        } else {
            assert.notEqual(test.expected_output, output);
        }
    });
}());

(function test_message_flags() {
    var message = {raw_content: '@**Leo**'};
    markdown.apply_markdown(message);
    assert(!_.contains(message.flags, 'mentioned'));

    message = {raw_content: '@**Cordelia Lear**'};
    markdown.apply_markdown(message);
    assert(_.contains(message.flags, 'mentioned'));

    message = {raw_content: '@**all**'};
    markdown.apply_markdown(message);
    assert(_.contains(message.flags, 'mentioned'));
}());

(function test_marked() {
    var test_cases = [
        {input: 'hello', expected: '<p>hello</p>'},
        {input: 'hello there', expected: '<p>hello there</p>'},
        {input: 'hello **bold** for you', expected: '<p>hello <strong>bold</strong> for you</p>'},
        {input: '__hello__', expected: '<p>__hello__</p>'},
        {input: '\n```\nfenced code\n```\n\nand then after\n',
         expected: '<div class="codehilite"><pre><span></span>fenced code\n</pre></div>\n\n\n<p>and then after</p>'},
        {input: '\n```\n    fenced code trailing whitespace            \n```\n\nand then after\n',
         expected: '<div class="codehilite"><pre><span></span>    fenced code trailing whitespace\n</pre></div>\n\n\n<p>and then after</p>'},
        {input: '* a\n* list \n* here',
         expected: '<ul>\n<li>a</li>\n<li>list </li>\n<li>here</li>\n</ul>'},
        {input: '\n```c#\nfenced code special\n```\n\nand then after\n',
         expected: '<div class="codehilite"><pre><span></span>fenced code special\n</pre></div>\n\n\n<p>and then after</p>'},
        {input: '\n```vb.net\nfenced code dot\n```\n\nand then after\n',
         expected: '<div class="codehilite"><pre><span></span>fenced code dot\n</pre></div>\n\n\n<p>and then after</p>'},
        {input: 'Some text first\n* a\n* list \n* here\n\nand then after',
         expected: '<p>Some text first</p>\n<ul>\n<li>a</li>\n<li>list </li>\n<li>here</li>\n</ul>\n<p>and then after</p>'},
        {input: '1. an\n2. ordered \n3. list',
         expected: '<p>1. an<br>\n2. ordered<br>\n3. list</p>'},
        {input: '\n~~~quote\nquote this for me\n~~~\nthanks\n',
         expected: '<blockquote>\n<p>quote this for me</p>\n</blockquote>\n<p>thanks</p>'},
        {input: 'This is a @**Cordelia Lear** mention',
         expected: '<p>This is a <span class="user-mention" data-user-id="101">@Cordelia Lear</span> mention</p>'},
        {input: 'These @ @**** are not mentions',
         expected: '<p>These @ @<em>**</em> are not mentions</p>'},
        {input: 'These # #**** are not mentions',
         expected: '<p>These # #<em>**</em> are not mentions</p>'},
        {input: 'These @* @*** are not mentions',
         expected: '<p>These @* @*** are not mentions</p>'},
        {input: 'These #* #*** are also not mentions',
         expected: '<p>These #* #*** are also not mentions</p>'},
        {input: 'This is a #**Denmark** stream link',
         expected: '<p>This is a <a class="stream" data-stream-id="1" href="http://zulip.zulipdev.com/#narrow/stream/Denmark">#Denmark</a> stream link</p>'},
        {input: 'This is #**Denmark** and #**social** stream links',
         expected: '<p>This is <a class="stream" data-stream-id="1" href="http://zulip.zulipdev.com/#narrow/stream/Denmark">#Denmark</a> and <a class="stream" data-stream-id="2" href="http://zulip.zulipdev.com/#narrow/stream/social">#social</a> stream links</p>'},
        {input: 'And this is a #**wrong** stream link',
         expected: '<p>And this is a #**wrong** stream link</p>'},
        {input: 'mmm...:burrito:s',
         expected: '<p>mmm...<img alt=":burrito:" class="emoji" src="/static/generated/emoji/images/emoji/burrito.png" title="burrito">s</p>'},
        {input: 'This is an :poop: message',
         expected: '<p>This is an <span class="emoji emoji-1f4a9" title="poop">:poop:</span> message</p>'},
        {input: "\ud83d\udca9",
         expected: '<p><span class="emoji emoji-1f4a9" title="poop">:poop:</span></p>'},
        {input: '\u{1f6b2}',
         expected: '<p>\u{1f6b2}</p>' },
        // Test only those realm filters which don't return True for
        // `contains_backend_only_syntax()`. Those which return True
        // are tested separately.
        {input: 'This is a realm filter #1234 with text after it',
         expected: '<p>This is a realm filter <a href="https://trac.zulip.net/ticket/1234" target="_blank" title="https://trac.zulip.net/ticket/1234">#1234</a> with text after it</p>'},
        {input: '#1234is not a realm filter.',
         expected: '<p>#1234is not a realm filter.</p>'},
        {input: 'A pattern written as #1234is not a realm filter.',
         expected: '<p>A pattern written as #1234is not a realm filter.</p>'},
        {input: 'This is a realm filter with ZGROUP_123:45 groups',
         expected: '<p>This is a realm filter with <a href="https://zone_45.zulip.net/ticket/123" target="_blank" title="https://zone_45.zulip.net/ticket/123">ZGROUP_123:45</a> groups</p>'},
        {input: 'This is an !avatar(cordelia@zulip.com) of Cordelia Lear',
         expected: '<p>This is an <img alt="cordelia@zulip.com" class="message_body_gravatar" src="/avatar/cordelia@zulip.com?s=30" title="cordelia@zulip.com"> of Cordelia Lear</p>'},
        {input: 'This is a !gravatar(cordelia@zulip.com) of Cordelia Lear',
         expected: '<p>This is a <img alt="cordelia@zulip.com" class="message_body_gravatar" src="/avatar/cordelia@zulip.com?s=30" title="cordelia@zulip.com"> of Cordelia Lear</p>'},
        {input: 'Test *italic*',
         expected: '<p>Test <em>italic</em></p>'},
        {input: 'T\n#**Denmark**',
         expected: '<p>T<br>\n<a class="stream" data-stream-id="1" href="http://zulip.zulipdev.com/#narrow/stream/Denmark">#Denmark</a></p>'},
        {input: 'T\n@**Cordelia Lear**',
          expected: '<p>T<br>\n<span class="user-mention" data-user-id="101">@Cordelia Lear</span></p>'},
        {input: 'This is a realm filter `hello` with text after it',
         expected: '<p>This is a realm filter <code>hello</code> with text after it</p>'},
    ];

    // We remove one of the unicode emoji we put as input in one of the test
    // cases (U+1F6B2), to verify that we display the emoji as it was input if it
    // isn't present in emoji_codes.codepoint_to_name.
    delete emoji_codes.codepoint_to_name['1f6b2'];

    test_cases.forEach(function (test_case) {
        var input = test_case.input;
        var expected = test_case.expected;

        var message = {raw_content: input};
        markdown.apply_markdown(message);
        var output = message.content;

        assert.equal(expected, output);
    });
}());

(function test_subject_links() {
    var message = {type: 'stream', subject: "No links here"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, []);

    message = {type: 'stream', subject: "One #123 link here"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, 1);
    assert.equal(message.subject_links[0], "https://trac.zulip.net/ticket/123");

    message = {type: 'stream', subject: "Two #123 #456 link here"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, 2);
    assert.equal(message.subject_links[0], "https://trac.zulip.net/ticket/123");
    assert.equal(message.subject_links[1], "https://trac.zulip.net/ticket/456");

    message = {type: 'stream', subject: "New ZBUG_123 link here"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, 1);
    assert.equal(message.subject_links[0], "https://trac2.zulip.net/ticket/123");

    message = {type: 'stream', subject: "New ZBUG_123 with #456 link here"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, 2);
    assert(message.subject_links.indexOf("https://trac2.zulip.net/ticket/123") !== -1);
    assert(message.subject_links.indexOf("https://trac.zulip.net/ticket/456") !== -1);

    message = {type: 'stream', subject: "One ZGROUP_123:45 link here"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, 1);
    assert.equal(message.subject_links[0], "https://zone_45.zulip.net/ticket/123");

    message = {type: "not-stream"};
    markdown.add_subject_links(message);
    assert.equal(message.subject_links.length, 0);
}());

(function test_message_flags() {
    var input = "/me is testing this";
    var message = {subject: "No links here", raw_content: input};
    message.flags = ['read'];
    markdown.apply_markdown(message);

    assert.equal(message.is_me_message, true);
    assert.equal(message.flags.length, 1);
    assert(message.flags.indexOf('read') !== -1);

    input = "testing this @**all** @**Cordelia Lear**";
    message = {subject: "No links here", raw_content: input};
    markdown.apply_markdown(message);

    assert.equal(message.is_me_message, false);
    assert.equal(message.flags.length, 1);
    assert(message.flags.indexOf('mentioned') !== -1);

    input = "test @all";
    message = {subject: "No links here", raw_content: input};
    markdown.apply_markdown(message);
    assert.equal(message.flags.length, 1);
    assert(message.flags.indexOf('mentioned') !== -1);

    input = "test @any";
    message = {subject: "No links here", raw_content: input};
    markdown.apply_markdown(message);
    assert.equal(message.flags.length, 0);
    assert(message.flags.indexOf('mentioned') === -1);
}());

(function test_backend_only_realm_filters() {
    var backend_only_realm_filters = [
        'Here is the PR-#123.',
        'Function abc() was introduced in (PR)#123.',
    ];
    backend_only_realm_filters.forEach(function (content) {
        assert.equal(markdown.contains_backend_only_syntax(content), true);
    });
}());

(function test_python_to_js_filter() {
    // The only way to reach python_to_js_filter is indirectly, hence the call
    // to set_realm_filters.
    markdown.set_realm_filters([['/a(?im)a/g'], ['/a(?L)a/g']]);
    var actual_value = (marked.InlineLexer.rules.zulip.realm_filters);
    var expected_value = [/\/aa\/g(?![\w])/gim, /\/aa\/g(?![\w])/g];
    assert.deepEqual(actual_value, expected_value);
}());

(function test_katex_throws_unexpected_exceptions() {
    katex.renderToString = function () { throw new Error('some-exception'); };
    var blueslip_error_called = false;
    blueslip.error = function (ex) {
        assert.equal(ex.message, 'some-exception');
        blueslip_error_called = true;
    };
    var message = { raw_content: '$$a$$' };
    markdown.apply_markdown(message);
    assert(blueslip_error_called);
}());
