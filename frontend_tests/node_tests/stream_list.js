global.stub_out_jquery();

add_dependencies({
    Handlebars: 'handlebars',
    colorspace: 'js/colorspace',
    hash_util: 'js/hash_util',
    hashchange: 'js/hashchange',
    muting: 'js/muting',
    narrow: 'js/narrow',
    stream_color: 'js/stream_color',
    stream_data: 'js/stream_data',
    stream_sort: 'js/stream_sort',
    subs: 'js/subs',
    templates: 'js/templates',
    unread: 'js/unread',
    util: 'js/util',
});

var stream_list = require('js/stream_list.js');


var jsdom = require("jsdom");
var window = jsdom.jsdom().defaultView;
global.$ = require('jquery')(window);
$.fn.expectOne = function () {
    assert(this.length === 1);
    return this;
};

global.compile_template('stream_sidebar_row');
global.compile_template('stream_privacy');

function clear_filters() {
    var stream_search_box = $('<input class="stream-list-filter" type="text" placeholder="Search streams">');
    var stream_filters = $('<ul id="stream_filters">');
    $("body").empty();
    $("body").append(stream_search_box);
    $("body").append(stream_filters);

}

(function test_create_sidebar_row() {
    // Make a couple calls to create_sidebar_row() and make sure they
    // generate the right markup as well as play nice with get_stream_li().

    clear_filters();

    var devel = {
        name: 'devel',
        stream_id: 100,
        color: 'blue',
        subscribed: true,
        id: 5,
    };
    global.stream_data.add_sub('devel', devel);

    var social = {
        name: 'social',
        stream_id: 200,
        color: 'green',
        subscribed: true,
        id: 6,
    };
    global.stream_data.add_sub('social', social);

    global.unread.num_unread_for_stream = function () {
        return 42;
    };

    stream_list.create_sidebar_row(devel);
    stream_list.create_sidebar_row(social);
    stream_list.build_stream_list();

    var html = $("body").html();
    global.write_test_output("test_create_sidebar_row", html);

    var li = stream_list.get_stream_li(social.stream_id);
    assert.equal(li.attr('data-name'), 'social');
    assert.equal(li.find('a.stream-name').text().trim(), 'social');
    assert(li.find('.arrow').find("i").hasClass("icon-vector-chevron-down"));

    global.append_test_output("Then make 'social' private.");
    global.stream_data.get_sub('social').invite_only = true;

    stream_list.redraw_stream_privacy('social');

    html = $("body").html();
    global.append_test_output(html);

    assert(li.find('.stream-privacy').find("i").hasClass("icon-vector-lock"));
}());


(function test_sort_streams() {
    clear_filters();

    stream_data.clear_subscriptions();

    // pinned streams
    var develSub = {
        name: 'devel',
        stream_id: 1000,
        color: 'blue',
        id: 5,
        pin_to_top: true,
        subscribed: true,
    };
    stream_list.create_sidebar_row(develSub);
    global.stream_data.add_sub('devel', develSub);

    var RomeSub = {
        name: 'Rome',
        stream_id: 2000,
        color: 'blue',
        id: 6,
        pin_to_top: true,
        subscribed: true,
    };
    stream_list.create_sidebar_row(RomeSub);
    global.stream_data.add_sub('Rome', RomeSub);

    var testSub = {
        name: 'test',
        stream_id: 3000,
        color: 'blue',
        id: 7,
        pin_to_top: true,
        subscribed: true,
    };
    stream_list.create_sidebar_row(testSub);
    global.stream_data.add_sub('test', testSub);

    // unpinned streams
    var announceSub = {
        name: 'announce',
        stream_id: 4000,
        color: 'green',
        id: 8,
        pin_to_top: false,
        subscribed: true,
    };
    stream_list.create_sidebar_row(announceSub);
    global.stream_data.add_sub('announce', announceSub);

    var DenmarkSub = {
        name: 'Denmark',
        stream_id: 5000,
        color: 'green',
        id: 9,
        pin_to_top: false,
        subscribed: true,
    };
    stream_list.create_sidebar_row(DenmarkSub);
    global.stream_data.add_sub('Denmark', DenmarkSub);

    var carSub = {
        name: 'cars',
        stream_id: 6000,
        color: 'green',
        id: 10,
        pin_to_top: false,
        subscribed: true,
    };
    stream_list.create_sidebar_row(carSub);
    global.stream_data.add_sub('cars', carSub);


    global.stream_data.is_active = function (sub) {
        return sub.name !== 'cars';
    };

    stream_list.build_stream_list();

    var streams = global.stream_sort.get_streams().slice(0, 6);

    assert.deepEqual(streams, [
        // three groups: pinned, normal, dormant
        'devel',
        'Rome',
        'test',
        //
        'announce',
        'Denmark',
        //
        'cars',
    ]);

    var li;
    var hr;

    // verify pinned streams are sorted by lowercase stream name
    li = stream_list.stream_sidebar.get_row(develSub.stream_id).get_li();
    assert.equal(li.next().find('[ data-name="Rome"]').length, 1);

    li = stream_list.stream_sidebar.get_row(RomeSub.stream_id).get_li();
    assert.equal(li.next().find('[ data-name="test"]').length, 1);

    li = stream_list.stream_sidebar.get_row(testSub.stream_id).get_li();

    // <hr>
    hr = li.next();
    assert.equal(hr.attr('class'), 'stream-split');

    // verify unpinned streams are sorted by lowercase stream name
    assert.equal(hr.next().find('[ data-name="announce"]').length, 1);

    li = stream_list.stream_sidebar.get_row(announceSub.stream_id).get_li();
    assert.equal(li.next().find('[ data-name="Denmark"]').length, 1);

    li = stream_list.stream_sidebar.get_row(DenmarkSub.stream_id).get_li();

    // <hr>
    hr = li.next();
    assert.equal(hr.attr('class'), 'stream-split');

    assert.equal(hr.next().find('[ data-name="cars"]').length, 1);

}());
