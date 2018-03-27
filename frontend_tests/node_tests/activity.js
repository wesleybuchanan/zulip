set_global('$', global.make_zjquery());

set_global('page_params', {
    realm_users: [],
    user_id: 999,
});

set_global('ui', {
    set_up_scrollbar: function () {},
});

set_global('feature_flags', {});

set_global('document', {
    hasFocus: function () {
        return true;
    },
});

set_global('XDate', require("xdate"));
set_global('blueslip', function () {});
set_global('channel', {});
set_global('compose_actions', {});

set_global('ui', {
    set_up_scrollbar: function () {},
    update_scrollbar: function () {},
});

zrequire('compose_fade');
zrequire('Handlebars', 'handlebars');
zrequire('templates');
zrequire('unread');
zrequire('hash_util');
zrequire('hashchange');
zrequire('narrow');
zrequire('util');
zrequire('presence');
zrequire('people');
zrequire('activity');

set_global('blueslip', {
    log: function () {},
});

set_global('reload', {
    is_in_progress: function () {return false;},
});
set_global('resize', {
    resize_page_components: function () {},
});
set_global('window', 'window-stub');

var me = {
    email: 'me@zulip.com',
    user_id: 999,
    full_name: 'Me Myself',
};

var alice = {
    email: 'alice@zulip.com',
    user_id: 1,
    full_name: 'Alice Smith',
};
var fred = {
    email: 'fred@zulip.com',
    user_id: 2,
    full_name: "Fred Flintstone",
};
var jill = {
    email: 'jill@zulip.com',
    user_id: 3,
    full_name: 'Jill Hill',
};
var mark = {
    email: 'mark@zulip.com',
    user_id: 4,
    full_name: 'Marky Mark',
};
var norbert = {
    email: 'norbert@zulip.com',
    user_id: 5,
    full_name: 'Norbert Oswald',
};

var zoe = {
    email: 'zoe@example.com',
    user_id: 6,
    full_name: 'Zoe Yang',
};

var people = global.people;

people.add_in_realm(alice);
people.add_in_realm(fred);
people.add_in_realm(jill);
people.add_in_realm(mark);
people.add_in_realm(norbert);
people.add_in_realm(zoe);
people.add_in_realm(me);
people.initialize_current_user(me.user_id);

var activity = require('js/activity.js');
var compose_fade = require('js/compose_fade.js');

compose_fade.update_faded_users = function () {};

var real_update_huddles = activity.update_huddles;
activity.update_huddles = function () {};

global.compile_template('user_presence_row');
global.compile_template('user_presence_rows');
global.compile_template('group_pms');

var presence_info = {};
presence_info[alice.user_id] = { status: 'inactive' };
presence_info[fred.user_id] = { status: 'active' };
presence_info[jill.user_id] = { status: 'active' };

presence.presence_info = presence_info;

(function test_get_status() {
    assert.equal(presence.get_status(page_params.user_id), "active");
    assert.equal(presence.get_status(alice.user_id), "inactive");
    assert.equal(presence.get_status(fred.user_id), "active");
    assert.equal(presence.get_status(zoe.user_id), "offline");
}());

(function test_reload_defaults() {
    var warned;

    blueslip.warn = function (msg) {
        assert.equal(msg, 'get_filter_text() is called before initialization');
        warned = true;
    };
    assert.equal(activity.get_filter_text(), '');
    assert(warned);
}());

(function test_sort_users() {
    var user_ids = [alice.user_id, fred.user_id, jill.user_id];

    activity._sort_users(user_ids);

    assert.deepEqual(user_ids, [
        fred.user_id,
        jill.user_id,
        alice.user_id,
    ]);
}());

(function test_process_loaded_messages() {

    var huddle1 = 'jill@zulip.com,norbert@zulip.com';
    var timestamp1 = 1382479029; // older

    var huddle2 = 'alice@zulip.com,fred@zulip.com';
    var timestamp2 = 1382479033; // newer

    var old_timestamp = 1382479000;

    var messages = [
        {
            type: 'private',
            display_recipient: [{id: jill.user_id}, {id: norbert.user_id}],
            timestamp: timestamp1,
        },
        {
            type: 'stream',
        },
        {
            type: 'private',
            display_recipient: [{id: me.user_id}], // PM to myself
        },
        {
            type: 'private',
            display_recipient: [{id: alice.user_id}, {id: fred.user_id}],
            timestamp: timestamp2,
        },
        {
            type: 'private',
            display_recipient: [{id: fred.user_id}, {id: alice.user_id}],
            timestamp: old_timestamp,
        },
    ];

    activity.process_loaded_messages(messages);

    var user_ids_string1 = people.emails_strings_to_user_ids_string(huddle1);
    var user_ids_string2 = people.emails_strings_to_user_ids_string(huddle2);
    assert.deepEqual(activity.get_huddles(), [user_ids_string2, user_ids_string1]);
}());

(function test_full_huddle_name() {
    function full_name(emails_string) {
        var user_ids_string = people.emails_strings_to_user_ids_string(emails_string);
        return activity.full_huddle_name(user_ids_string);
    }

    assert.equal(
        full_name('alice@zulip.com,jill@zulip.com'),
        'Alice Smith, Jill Hill');

    assert.equal(
        full_name('alice@zulip.com,fred@zulip.com,jill@zulip.com'),
        'Alice Smith, Fred Flintstone, Jill Hill');
}());

(function test_short_huddle_name() {
    function short_name(emails_string) {
        var user_ids_string = people.emails_strings_to_user_ids_string(emails_string);
        return activity.short_huddle_name(user_ids_string);
    }

    assert.equal(
        short_name('alice@zulip.com'),
        'Alice Smith');

    assert.equal(
        short_name('alice@zulip.com,jill@zulip.com'),
        'Alice Smith, Jill Hill');

    assert.equal(
        short_name('alice@zulip.com,fred@zulip.com,jill@zulip.com'),
        'Alice Smith, Fred Flintstone, Jill Hill');

    assert.equal(
        short_name('alice@zulip.com,fred@zulip.com,jill@zulip.com,mark@zulip.com'),
        'Alice Smith, Fred Flintstone, Jill Hill, + 1 other');

    assert.equal(
        short_name('alice@zulip.com,fred@zulip.com,jill@zulip.com,mark@zulip.com,norbert@zulip.com'),
        'Alice Smith, Fred Flintstone, Jill Hill, + 2 others');

}());

(function test_huddle_fraction_present() {
    var huddle = 'alice@zulip.com,fred@zulip.com,jill@zulip.com,mark@zulip.com';
    huddle = people.emails_strings_to_user_ids_string(huddle);

    var presence_info = {};
    presence_info[alice.user_id] = { status: 'active' };
    presence_info[fred.user_id] = { status: 'idle' }; // counts as present
    // jill not in list
    presence_info[mark.user_id] = { status: 'offline' }; // does not count
    presence.presence_info = presence_info;

    assert.equal(
        activity.huddle_fraction_present(huddle),
        '0.50');
}());

presence.presence_info = {};
presence.presence_info[alice.user_id] = { status: activity.IDLE };
presence.presence_info[fred.user_id] = { status: activity.ACTIVE };
presence.presence_info[jill.user_id] = { status: activity.ACTIVE };
presence.presence_info[mark.user_id] = { status: activity.IDLE };
presence.presence_info[norbert.user_id] = { status: activity.ACTIVE };
presence.presence_info[zoe.user_id] = { status: activity.ACTIVE };
presence.presence_info[me.user_id] = { status: activity.ACTIVE };

activity.set_user_list_filter();

(function test_presence_list_full_update() {
    var users = activity.build_user_sidebar();
    assert.deepEqual(users, [{
            name: 'Fred Flintstone',
            href: '#narrow/pm-with/2-fred',
            user_id: fred.user_id,
            num_unread: 0,
            type: 'active',
            type_desc: 'is active',
        },
        {
            name: 'Jill Hill',
            href: '#narrow/pm-with/3-jill',
            user_id: jill.user_id,
            num_unread: 0,
            type: 'active',
            type_desc: 'is active',
        },
        {
            name: 'Norbert Oswald',
            href: '#narrow/pm-with/5-norbert',
            user_id: norbert.user_id,
            num_unread: 0,
            type: 'active',
            type_desc: 'is active',
        },
        {
            name: 'Zoe Yang',
            href: '#narrow/pm-with/6-zoe',
            user_id: zoe.user_id,
            num_unread: 0,
            type: 'active',
            type_desc: 'is active',
        },
        {
            name: 'Alice Smith',
            href: '#narrow/pm-with/1-alice',
            user_id: alice.user_id,
            num_unread: 0,
            type: 'idle',
            type_desc: 'is not active',
        },
        {
            name: 'Marky Mark',
            href: '#narrow/pm-with/4-mark',
            user_id: mark.user_id,
            num_unread: 0,
            type: 'idle',
            type_desc: 'is not active',
        },
    ]);
}());

(function test_PM_update_dom_counts() {
    var value = $.create('alice-value');
    var count = $.create('alice-count');
    var pm_key = alice.user_id.toString();
    var li = $("li.user_sidebar_entry[data-user-id='" + pm_key + "']");
    count.set_find_results('.value', value);
    li.set_find_results('.count', count);
    count.set_parent(li);

    var counts = new Dict();
    counts.set(pm_key, 5);
    li.addClass('user_sidebar_entry');

    activity.update_dom_with_unread_counts({pm_count: counts});
    assert(li.hasClass('user-with-count'));
    assert.equal(value.text(), 5);

    counts.set(pm_key, 0);

    activity.update_dom_with_unread_counts({pm_count: counts});
    assert(!li.hasClass('user-with-count'));
    assert.equal(value.text(), '');
}());

(function test_group_update_dom_counts() {
    var value = $.create('alice-fred-value');
    var count = $.create('alice-fred-count');
    var pm_key = alice.user_id.toString() + "," + fred.user_id.toString();
    var li_selector = "li.group-pms-sidebar-entry[data-user-ids='" + pm_key + "']";
    var li = $(li_selector);
    count.set_find_results('.value', value);
    li.set_find_results('.count', count);
    count.set_parent(li);

    var counts = new Dict();
    counts.set(pm_key, 5);
    li.addClass('group-pms-sidebar-entry');

    activity.update_dom_with_unread_counts({pm_count: counts});
    assert(li.hasClass('group-with-count'));
    assert.equal(value.text(), 5);

    counts.set(pm_key, 0);

    activity.update_dom_with_unread_counts({pm_count: counts});
    assert(!li.hasClass('group-with-count'));
    assert.equal(value.text(), '');
}());

// Mock the jquery is func
$('.user-list-filter').is = function (sel) {
    if (sel === ':focus') {
        return $('.user-list-filter').is_focused();
    }
};

(function test_maybe_select_person() {
    var e = {
        keyCode: 13,
        stopPropagation: function () {},
        preventDefault: function () {},
    };
    $('#user_presences li.user_sidebar_entry').first = function () {
        return {
            attr: function (attr) {
                assert.equal(attr, 'data-user-id');
                return 1;
            },
        };
    };
    $(".user-list-filter").expectOne().val('ali');
    narrow.by = function (method, email) {
      assert.equal(email, 'alice@zulip.com');
    };
    compose_actions.start = function () {};

    activity.set_user_list_filter_handlers();
    var keydown_handler = $('.user-list-filter').get_on_handler('keydown');
    keydown_handler(e);
}());

(function test_focus_user_filter() {
    var e = {
        stopPropagation: function () {},
    };
    var click_handler = $('.user-list-filter').get_on_handler('click');
    click_handler(e);
}());

presence.presence_info = {};
presence.presence_info[alice.user_id] = { status: activity.ACTIVE };
presence.presence_info[fred.user_id] = { status: activity.ACTIVE };
presence.presence_info[jill.user_id] = { status: activity.ACTIVE };
presence.presence_info[mark.user_id] = { status: activity.IDLE };
presence.presence_info[norbert.user_id] = { status: activity.ACTIVE };
presence.presence_info[zoe.user_id] = { status: activity.ACTIVE };

(function test_filter_user_ids() {
    var user_filter = $('.user-list-filter');
    user_filter.val(''); // no search filter

    activity.set_user_list_filter();

    var user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, [
        alice.user_id,
        fred.user_id,
        jill.user_id,
        norbert.user_id,
        zoe.user_id,
        mark.user_id,
    ]);

    user_filter.val('abc'); // no match
    user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, []);

    user_filter.val('fred'); // match fred
    user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, [fred.user_id]);

    user_filter.val('fred,alice'); // match fred and alice
    user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, [alice.user_id, fred.user_id]);

    user_filter.val('fr,al'); // match fred and alice partials
    user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, [alice.user_id, fred.user_id]);

    presence.presence_info[alice.user_id] = { status: activity.IDLE };
    user_filter.val('fr,al'); // match fred and alice partials and idle user
    user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, [fred.user_id, alice.user_id]);

    $.stub_selector('.user-list-filter', []);
    presence.presence_info[alice.user_id] = { status: activity.ACTIVE };
    user_ids = activity.get_filtered_and_sorted_user_ids();
    assert.deepEqual(user_ids, [alice.user_id, fred.user_id]);
}());

(function test_insert_one_user_into_empty_list() {
    var alice_li = $.create('alice list item');

    // These selectors are here to avoid some short-circuit logic.
    $('#user_presences').set_find_results('[data-user-id="1"]', alice_li);

    var appended_html;
    $('#user_presences').append = function (html) {
        appended_html = html;
    };

    $.stub_selector('#user_presences li', {
        toArray: function () {
            return [];
        },
    });
    activity.insert_user_into_list(alice.user_id);
    assert(appended_html.indexOf('data-user-id="1"') > 0);
    assert(appended_html.indexOf('user_active') > 0);
}());

(function test_insert_fred_after_alice() {
    var fred_li = $.create('fred list item');

    // These selectors are here to avoid some short-circuit logic.
    $('#user_presences').set_find_results('[data-user-id="2"]', fred_li);

    var appended_html;
    $('#user_presences').append = function (html) {
        appended_html = html;
    };

    $('<fake html for alice>').attr = function (attr_name) {
        assert.equal(attr_name, 'data-user-id');
        return alice.user_id;
    };

    $.stub_selector('#user_presences li', {
        toArray: function () {
            return [
                '<fake html for alice>',
            ];
        },
    });
    activity.insert_user_into_list(fred.user_id);

    assert(appended_html.indexOf('data-user-id="2"') > 0);
    assert(appended_html.indexOf('user_active') > 0);
}());

(function test_insert_fred_before_jill() {
    var fred_li = $.create('fred-li');

    // These selectors are here to avoid some short-circuit logic.
    $('#user_presences').set_find_results('[data-user-id="2"]', fred_li);

    $('<fake-dom-for-jill').attr = function (attr_name) {
        assert.equal(attr_name, 'data-user-id');
        return jill.user_id;
    };

    $.stub_selector('#user_presences li', {
        toArray: function () {
            return [
                '<fake-dom-for-jill',
            ];
        },
    });

    var before_html;
    $('<fake-dom-for-jill').before = function (html) {
        before_html = html;
    };
    activity.insert_user_into_list(fred.user_id);

    assert(before_html.indexOf('data-user-id="2"') > 0);
    assert(before_html.indexOf('user_active') > 0);
}());

// Reset jquery here.
set_global('$', global.make_zjquery());
activity.set_user_list_filter();

(function test_insert_unfiltered_user_with_filter() {
    // This test only tests that we do not explode when
    // try to insert Fred into a list where he does not
    // match the search filter.
    var user_filter = $('.user-list-filter');
    user_filter.val('do-not-match-filter');
    activity.insert_user_into_list(fred.user_id);
}());

(function test_realm_presence_disabled() {
    page_params.realm_presence_disabled = true;
    unread.suppress_unread_counts = false;

    activity.insert_user_into_list();
    activity.build_user_sidebar();

    real_update_huddles();
}());

// Mock the jquery is func
$('.user-list-filter').is = function (sel) {
    if (sel === ':focus') {
        return $('.user-list-filter').is_focused();
    }
};

(function test_clear_search() {
    $('.user-list-filter').val('somevalue');
    $('#clear_search_people_button').prop('disabled', false);
    $('.user-list-filter').focus();
    activity.clear_search();
    assert.equal($('.user-list-filter').val(), '');
    assert.equal($('.user-list-filter').is_focused(), false);
    assert.equal($('#clear_search_people_button').attr('disabled'), 'disabled');
}());

(function test_blur_search() {
    $('.user-list-filter').val('somevalue');
    $('.user-list-filter').focus();
    $('#clear_search_people_button').attr('disabled', 'disabled');
    activity.blur_search();
    assert.equal($('.user-list-filter').is_focused(), false);
    assert.equal($('#clear_search_people_button').prop('disabled'), false);
    $('.user-list-filter').val('');
    activity.blur_search();
    assert.equal($('#clear_search_people_button').attr('disabled'), 'disabled');
}());

(function test_initiate_search() {
    $('.user-list-filter').blur();
    activity.initiate_search();
    assert.equal($('.user-list-filter').is_focused(), true);
}());

(function test_escape_search() {
    $('.user-list-filter').val('');
    activity.escape_search();
    assert.equal($('.user-list-filter').is_focused(), false);
    $('.user-list-filter').val('foobar');
    $('#clear_search_people_button').prop('disabled', false);
    activity.escape_search();
    assert.equal($('.user-list-filter').val(), '');
    assert.equal($('#clear_search_people_button').attr('disabled'), 'disabled');
    $('.user-list-filter').focus();
    $('.user-list-filter').val('foobar');
    activity.escape_search();
    assert.equal($('#clear_search_people_button').prop('disabled'), false);
}());

(function test_searching() {
    $('.user-list-filter').focus();
    assert.equal(activity.searching(), true);
    $('.user-list-filter').blur();
    assert.equal(activity.searching(), false);
}());

(function test_update_huddles_and_redraw() {
    var value = $.create('alice-fred-value');
    var count = $.create('alice-fred-count');
    var pm_key = alice.user_id.toString() + "," + fred.user_id.toString();
    var li_selector = "li.group-pms-sidebar-entry[data-user-ids='" + pm_key + "']";
    var li = $(li_selector);
    count.set_find_results('.value', value);
    li.set_find_results('.count', count);
    count.set_parent(li);

    var real_get_huddles = activity.get_huddles;
    activity.get_huddles = function () {
        return ['1,2'];
    };
    activity.update_huddles = real_update_huddles;
    activity.redraw();
    assert.equal($('#group-pm-list').hasClass('show'), false);
    page_params.realm_presence_disabled = false;
    activity.redraw();
    assert.equal($('#group-pm-list').hasClass('show'), true);
    activity.get_huddles = function () {
        return [];
    };
    activity.redraw();
    assert.equal($('#group-pm-list').hasClass('show'), false);
    activity.get_huddles = real_get_huddles;
    activity.update_huddles = function () {};
}());

(function test_set_user_status() {
    var server_time = 500;
    var info = {
        website: {
            status: "active",
            timestamp: server_time,
        },
    };
    var alice_li = $.create('alice-li');

    $('#user_presences').set_find_results('[data-user-id="1"]', alice_li);

    $('#user_presences').append = function () {};

    $.stub_selector('#user_presences li', {
        toArray: function () {
            return [];
        },
    });
    presence.presence_info[alice.user_id] = undefined;
    activity.set_user_status(me.email, info, server_time);
    assert.equal(presence.presence_info[alice.user_id], undefined);
    activity.set_user_status(alice.email, info, server_time);
    var expected = { status: 'active', mobile: false, last_active: 500 };
    assert.deepEqual(presence.presence_info[alice.user_id], expected);
    activity.set_user_status(alice.email, info, server_time);
    blueslip.warn = function (msg) {
        assert.equal(msg, 'unknown email: foo@bar.com');
    };
    blueslip.error = function () {};
    activity.set_user_status('foo@bar.com', info, server_time);
}());

(function test_initialize() {
  $.stub_selector('html', {
      on: function (name, func) {
          func();
      },
  });
  $(window).focus = function (func) {
      func();
  };
  $(window).idle = function () {};

  channel.post = function (payload) {
      payload.success({});
  };
  global.server_events = {
      check_for_unsuspend: function () {},
  };
  activity.has_focus = false;
  activity.initialize();
  assert(!activity.new_user_input);
  assert(!$('#zephyr-mirror-error').hasClass('show'));
  assert.equal(page_params.presences, undefined);
  assert(activity.has_focus);
  $(window).idle = function (params) {
      params.onIdle();
  };
  channel.post = function (payload) {
      payload.success({
          zephyr_mirror_active: false,
      });
  };
  global.setInterval = function (func) {
      func();
  };
  activity.initialize();
  assert($('#zephyr-mirror-error').hasClass('show'));
  assert(!activity.new_user_input);
  assert(!activity.has_focus);

  // Now execute the reload-in-progress code path
  reload.is_in_progress = function () {
      return true;
  };
  activity.initialize();

}());
