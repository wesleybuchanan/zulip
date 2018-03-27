set_global("page_params", {
    realm_uri: "https://chat.example.com",
});

set_global("avatar", {});

add_dependencies({
    bot_data: 'js/bot_data.js',
    upload_widget: 'js/upload_widget.js',
});

set_global('$', global.make_zjquery());
set_global('document', 'document-stub');

var settings_bots = require("js/settings_bots.js");

(function test_generate_zuliprc_uri() {
    var bot = {
        email: "error-bot@zulip.org",
        api_key: "QadL788EkiottHmukyhHgePUFHREiu8b",
    };
    var uri = settings_bots.generate_zuliprc_uri(bot.email, bot.api_key);
    var expected = "data:application/octet-stream;charset=utf-8," + encodeURIComponent(
        "[api]\nemail=error-bot@zulip.org\n" +
        "key=QadL788EkiottHmukyhHgePUFHREiu8b\n" +
        "site=https://chat.example.com\n"
    );

    assert.equal(uri, expected);
}());

(function test_generate_zuliprc_content() {
    var user = {
        email: "admin12@chatting.net",
        api_key: "nSlA0mUm7G42LP85lMv7syqFTzDE2q34",
    };
    var content = settings_bots.generate_zuliprc_content(user.email, user.api_key);
    var expected = "[api]\nemail=admin12@chatting.net\n" +
                   "key=nSlA0mUm7G42LP85lMv7syqFTzDE2q34\n" +
                   "site=https://chat.example.com\n";

    assert.equal(content, expected);
}());

(function test_generate_flaskbotrc_content() {
    var user = {
        email: "vabstest-bot@zulip.com",
        api_key: "nSlA0mUm7G42LP85lMv7syqFTzDE2q34",
    };
    var content = settings_bots.generate_flaskbotrc_content(user.email, user.api_key);
    var expected = "[vabstest]\nemail=vabstest-bot@zulip.com\n" +
                   "key=nSlA0mUm7G42LP85lMv7syqFTzDE2q34\n" +
                   "site=https://chat.example.com\n";

    assert.equal(content, expected);
}());

function test_create_bot_type_input_box_toggle(f) {
    var create_payload_url = $('#create_payload_url');
    var payload_url_inputbox = $('#payload_url_inputbox');
    var OUTGOING_WEBHOOK_BOT_TYPE = '3';
    var GENERIC_BOT_TYPE = '1';

    $('#create_bot_type :selected').val(OUTGOING_WEBHOOK_BOT_TYPE);
    f.apply();
    assert(create_payload_url.hasClass('required'));
    assert(payload_url_inputbox.visible());

    $('#create_bot_type :selected').val(GENERIC_BOT_TYPE);
    f.apply();
    assert(!(create_payload_url.hasClass('required')));
    assert(!payload_url_inputbox.visible());
}

(function test_set_up() {
    // bunch of stubs

    $.validator = { addMethod: function () {} };

    $("#get_api_key_box form").ajaxForm = function () {};

    $("#create_bot_form").validate = function () {};

    $('#create_bot_type').on = function (action, f) {
        if (action === 'change') {
            test_create_bot_type_input_box_toggle(f);
        }
    };

    avatar.build_bot_create_widget = function () {};
    avatar.build_bot_edit_widget = function () {};

    settings_bots.set_up();
}());

