var tg = require('js/topic_generator.js');

function is_even(i) { return i % 2 === 0; }
function is_odd(i) { return i % 2 === 1; }

(function test_basics() {
    var gen = tg.list_generator([10, 20, 30]);
    assert.equal(gen.next(), 10);
    assert.equal(gen.next(), 20);
    assert.equal(gen.next(), 30);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

    var gen1 = tg.list_generator([100, 200]);
    var gen2 = tg.list_generator([300, 400]);
    var outers = [gen1, gen2];
    gen = tg.chain(outers);
    assert.equal(gen.next(), 100);
    assert.equal(gen.next(), 200);
    assert.equal(gen.next(), 300);
    assert.equal(gen.next(), 400);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

    gen = tg.wrap([5, 15, 25, 35], 25);
    assert.equal(gen.next(), 25);
    assert.equal(gen.next(), 35);
    assert.equal(gen.next(), 5);
    assert.equal(gen.next(), 15);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

    gen = tg.wrap_exclude([5, 15, 25, 35], 25);
    assert.equal(gen.next(), 35);
    assert.equal(gen.next(), 5);
    assert.equal(gen.next(), 15);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

    gen = tg.wrap([5, 15, 25, 35], undefined);
    assert.equal(gen.next(), 5);

    gen = tg.wrap_exclude([5, 15, 25, 35], undefined);
    assert.equal(gen.next(), 5);

    gen = tg.wrap([5, 15, 25, 35], 17);
    assert.equal(gen.next(), 5);

    gen = tg.wrap([], 42);
    assert.equal(gen.next(), undefined);

    var ints = tg.list_generator([1, 2, 3, 4, 5]);
    gen = tg.filter(ints, is_even);
    assert.equal(gen.next(), 2);
    assert.equal(gen.next(), 4);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

    ints = tg.list_generator([]);
    gen = tg.filter(ints, is_even);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

}());

(function test_fchain() {
    var mults = function (n) {
        var ret = 0;
        return {
            next: function () {
                ret += n;
                return (ret <= 100) ? ret : undefined;
            },
        };
    };

    var ints = tg.list_generator([29, 43]);
    var gen = tg.fchain(ints, mults);
    assert.equal(gen.next(), 29);
    assert.equal(gen.next(), 58);
    assert.equal(gen.next(), 87);
    assert.equal(gen.next(), 43);
    assert.equal(gen.next(), 86);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

    ints = tg.wrap([33, 34, 37], 37);
    ints = tg.filter(ints, is_odd);
    gen = tg.fchain(ints, mults);
    assert.equal(gen.next(), 37);
    assert.equal(gen.next(), 74);
    assert.equal(gen.next(), 33);
    assert.equal(gen.next(), 66);
    assert.equal(gen.next(), 99);
    assert.equal(gen.next(), undefined);
    assert.equal(gen.next(), undefined);

}());


(function test_topics() {
    var streams = [1, 2, 3, 4];
    var topics = {};

    topics[1] = ['read', 'read', '1a', '1b', 'read', '1c'];
    topics[2] = [];
    topics[3] = ['3a', 'read', 'read', '3b', 'read'];
    topics[4] = ['4a'];

    function has_unread_messages(stream, topic) {
        return topic !== 'read';
    }

    function get_topics(stream) {
        return topics[stream];
    }

    function next_topic(curr_stream, curr_topic) {
        return tg.next_topic(
            streams,
            get_topics,
            has_unread_messages,
            curr_stream,
            curr_topic);
    }

    assert.equal(next_topic(1, '1a'), '1b');
    assert.equal(next_topic(1, undefined), '1a');
    assert.equal(next_topic(2, 'bogus'), '3a');
    assert.equal(next_topic(3, '3b'), '3a');
    assert.equal(next_topic(4, '4a'), '1a');
    assert.equal(next_topic(undefined, undefined), '1a');
}());
