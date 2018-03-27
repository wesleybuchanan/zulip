# Writing interactive bots

Zulip's API supports a few different ways of integrating with a
third-party service.

* **Incoming webhook integrations**, for when you just want notifications from
  a tool to be sent into Zulip.  See the
  [integrations guide](
  http://zulip.readthedocs.io/en/latest/integration-guide.html?highlight=integrations).
* **Interactive bots**, for when you want the tool to react to
  messages in Zulip.

* This guide is about writing and testing interactive bots. We assume
 familiarity with our
 [guide for running bots](running-bots-guide.html).

On this page you'll find:
* A step-by-step
  [guide](#installing-a-development-version-of-the-zulip-bots-package)
  on how to set up a development environment for writing bots with all
  of our nice tooling to make it easy to write and test your work.
* A [guide](#writing-a-bot) on writing a bot.
* A [guide](#adding-a-bot-to-zulip) on adding a bot to Zulip.
* A [guide](#testing-a-bot-s-output) on testing a bot's output.
* A [documentation](#bot-api) of the bot API.
* Common [problems](#common-problems) when developing/running bots and their solutions.

## Installing a development version of the `zulip_bots` package

1. `git clone https://github.com/zulip/python-zulip-api.git` - clone the [python-zulip-api](
  https://github.com/zulip/python-zulip-api) repository.

2. `cd python-zulip-api` - navigate into your cloned repository.

3. `./tools/provision` - install all requirements in a Python virtualenv.

4. Run the `source <activation/path>` command printed in the previous
   step to activate the virtualenv.

5. *Finished*. You should now see the name of your venv preceding your prompt, e.g. `(ZULIP-~1)`.

*Hint: `./tools/provision` installs `zulip`, `zulip_bots`, and
 `zulip_botserver` in developer mode. This enables you to make changes
 to the code after the packages are installed.*

## Writing a bot

The tutorial below explains the structure of a bot `<my-bot>.py`,
which is the only file you need to create for a new bot. You
can use this as boilerplate code for developing your own bot.

Every bot is built upon this structure:

```
class MyBotHandler(object):
    '''
    A docstring documenting this bot.
    '''

    def usage(self):
        return '''Your description of the bot'''

    def handle_message(self, message, bot_handler, state_handler):
        # add your code here

handler_class = MyBotHandler
```

* The class name (in this case *MyBotHandler*) can be defined by you
  and should match the name of your bot. To register your bot's class,
  adjust the last line `handler_class = MyBotHandler` to match your
  class name.

* Every bot needs to implement the functions
    * `usage(self)`
    * `handle_message(self, message, bot_handler)`

* These functions are documented in the [next section](#bot-api).

## Adding a bot to Zulip

Zulip's bot system resides in the [python-zulip-api](
https://github.com/zulip/python-zulip-api) repository.

The structure of the bots ecosystem looks like the following:

```
zulip_bots
└───zulip_bots
    ├───bots
    │   ├───bot1
    │   └───bot2
    │       │
    │       ├───bot2.py
    │       ├───bot2.conf
    │       ├───doc.md
    │       ├───test_bot2.py
    │       ├───assets
    │       │   │
    │       │   └───pic.png
    │       ├───fixtures
    │       │   │
    │       │   └───test1.json
    │       └───libraries
    │           │
    │           └───lib1.py
    ├─── lib.py
    ├─── test_lib.py
    ├─── run.py
    └─── provision.py
```

Each subdirectory in `bots` contains a bot. When writing bots, try to use the structure outlined
above as an orientation.

## Testing a bot's output

If you just want to see how a bot reacts to a message, but don't want to set it up on a server,
we have a little tool to help you out: `zulip-bot-output`

* [Install all requirements](#installing-a-development-version-of-the-zulip-bots-package).

* Run `zulip-bot-output <bot-name> --message "<your-message>"` to test one of the bots in
  [`zulip_bots/bots`](https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots)

  * Example: `zulip-bot-output converter --message "12 meter yard"`

    Response: `12.0 meter = 13.12336 yard`

* Run `zulip-bot-output <path/to/bot.py> --message "<your-message>"` to specify the bot's path yourself.

  * Example: `zulip-bot-output zulip_bots/zulip_bots/bots/converter/converter.py --message "12 meter yard"`

    Response: `12.0 meter = 13.12336 yard`

## Bot API

This section documents functions available to the bot and the structure of the bot's config file.

With this API, you *can*

* intercept, view, and process messages sent by users on Zulip.
* send out new messages as replies to the processed messages.

With this API, you *cannot*

* modify an intercepted message (you have to send a new message).
* send messages on behalf of or impersonate other users.
* intercept private messages (except for PMs with the bot as an
explicit recipient).

### usage

*usage(self)*

is called to retrieve information about the bot.

#### Arguments

* self - the instance the method is called on.

#### Return values

* A string describing the bot's functionality

#### Example implementation

```
def usage(self):
    return '''
        This plugin will allow users to flag messages
        as being follow-up items.  Users should preface
        messages with "@followup".
        Before running this, make sure to create a stream
        called "followup" that your API user can send to.
        '''
```

### handle_message

*handle_message(self, message, bot_handler)*

handles user message.

#### Arguments

* self - the instance the method is called on.

* message - a dictionary describing a Zulip message

* bot_handler - used to interact with the server, e.g. to send a message

* state_handler - used to save states/information of the bot **beta**
    * use `state_handler.set_state(state)` to set a state (any object)
    * use `state_handler.get_state()` to retrieve the state set; returns a `NoneType` object if no state is set

#### Return values

None.

#### Example implementation

 ```
  def handle_message(self, message, bot_handler, state_handler):
     original_content = message['content']
     original_sender = message['sender_email']
     new_content = original_content.replace('@followup',
                                            'from %s:' % (original_sender,))

     bot_handler.send_message(dict(
         type='stream',
         to='followup',
         subject=message['sender_email'],
         content=new_content,
     ))
 ```
### bot_handler.send_message

*bot_handler.send_message(message)*

will send a message as the bot user.  Generally, this is less
convenient than *send_reply*, but it offers additional flexibility
about where the message is sent to.

#### Arguments

* message - a dictionary describing the message to be sent by the bot

#### Example implementation

```
bot_handler.send_message(dict(
    type='stream', # can be 'stream' or 'private'
    to=stream_name, # either the stream name or user's email
    subject=subject, # message subject
    content=message, # content of the sent message
))
```

### bot_handler.send_reply

*bot_handler.send_reply(message, response)*

will reply to the triggering message to the same place the original
message was sent to, with the content of the reply being *response*.

#### Arguments

* message - Dictionary containing information on message to respond to
 (provided by `handle_message`).
* response - Response message from the bot (string).

### bot_handler.update_message

*bot_handler.update_message(message)*

will edit the content of a previously sent message.

#### Arguments

* message - dictionary defining what message to edit and the new content

#### Example

From `zulip_bots/bots/incrementor/incrementor.py`:

```
bot_handler.update_message(dict(
    message_id=self.message_id, # id of message to be updated
    content=str(self.number), # string with which to update message with
))
```

### Configuration file

 ```
 [api]
 key=<api-key>
 email=<email>
 site=<dev-url>
 ```

* key - the API key you created for the bot; this is how Zulip knows
  the request is from an authorized user.

* email - the email address of the bot, e.g. `some-bot@zulip.com`

* site - your development environment URL; if you are working on a
  development environment hosted on your computer, use
  `localhost:9991`

## Writing tests for bots

Bots, like most software that you want to work, should have unit tests. In this section,
we detail our framework for writing unit tests for bots. We require that bots in the main
[`python-zulip-api`](https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots)
repository include a reasonable set of unit tests, so that future developers can easily
refactor them.

*Unit tests for bots make heavy use of mocking. If you want to get comfortable with mocking,
 mocking strategies, etc. you should check out our [mocking guide](
 testing-with-django.html#testing-with-mocks).*

### A simple example

 Let's have a look at a simple test suite for the [`helloworld`](
 https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots/helloworld)
 bot (the actual test is written slightly more compact).

    from __future__ import absolute_import

    from zulip_bots.test_lib import BotTestCase  # The test system library

    class TestHelloWorldBot(BotTestCase):
        bot_name = "helloworld"  # The bot's name (should be the name of the bot module to test).

        def test_bot(self): # A test case (must start with `test`)
            # Messages we want to test and the expected bot responses.
            message_response_pairs = {"" : "beep boop",
                                      "foo" : "beep boop",
                                      "Hi, my name is abc" : "beep boop"}
            self.check_expected_responses(message_response_pairs)  # Test the bot with our message_response_pair dict.

The `helloworld` bot replies with "beep boop" to every message @-mentioning it.
Note that our helper method `check_expected_responses` adds the @-mention for us - the only
thing we need to do is to specify the rest of the message and the expected response. In this
case, we want to assert that the bot always replies with "beep boop". To do so, we specify
several test messages ("", "foo", "Hi, my name is abc") and assert that the response is always
correct, which for this simple bot, means always sending a reply with the content "beep boop".

### Testing your test

Once you have written a test suite, you want to verify that everything works as expected.

* To test a bot in [Zulip's bot directory](
  https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots):
  `tools/test-bots <botname>`

* To run any test: `python -m unittest -v <package.bot_test>`

* To run all bot tests: `tools/test-bots`

### Advanced testing

This section shows advanced testing techniques for more complicated bots that have
configuration files or interact with third-party APIs.
*The code for the bot testing library can be found [here](
 https://github.com/zulip/python-zulip-api/blob/master/zulip_bots/zulip_bots/test_lib.py).*

#### Asserting individual messages

    self.assert_bot_response(
        message = {'content': 'foo'},
        response = {'content': 'bar'},
        expected_method='send_reply'
    )

Use `assert_bot_response()` to test individual messages. Specify additional message
settings, such as the stream or subject, in the `message` and `response` dicts.

#### Testing bots with config files

Some bots, such as [Giphy](
https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots/giphy),
support or require user configuration options to control how the bot works. To test such
a bot, you can use the following helper method:

    with self.mock_config_info({'entry': 'value'}):
        # self.assert_bot_response(...)

`mock_config_info()` mocks a bot's config file. All config files are specified in the
.ini format, with one default section. The dict passed to `mock_config_info()` specifies
the keys and values of that section.

#### Testing bots with internet access

Some bots, such as [Giphy](
https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots/giphy),
depend on a third-party we service, such as the Giphy webapp, in order to work. Because
we want our test suite to be reliable and not add load to these third-party APIs, tests
for these services need to have "test fixtures": sample HTTP request/response pairs to
be used by the tests. You can specify which one to use in your test code using the
following helper method:

    with self.mock_http_conversation('test_fixture_name'):
        # self.assert_bot_response(...)

`mock_http_conversation(fixture_name)` patches `requests.get` and returns the data specified
in the file `fixtures/<fixture_name>.py`. For an example, check out the [giphy bot](
https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots/giphy).

*Tip: You can use [requestb.in](http://requestb.in) or a similar tool to capture payloads from the
service your bot is interacting with.*

#### Testing bots that specify `initialize()`

Some bots, such as [Giphy](
https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots/giphy),
implement an `initialize()` method, which is executed on the startup of the bot. To test
such a bot, you can call its `initialize()` method with the following helper method:

    self.initialize_bot()

Calling `initialize_bot()` invokes the `initialize()` method specified by the bot.

#### Examples

Check out our [bots](https://github.com/zulip/python-zulip-api/tree/master/zulip_bots/zulip_bots/bots)
to see examples of bot tests.

## Common problems

* I modified my bot's code, yet the changes don't seem to have an effect.
    * Ensure that you restarted the `zulip-run-bot` script.

* My bot won't start
    * Ensure that your API config file is correct (download the config file from the server).
    * Ensure that you bot script is located in zulip_bots/bots/<my-bot>/
    * Are you using your own Zulip development server? Ensure that you run your bot outside
      the Vagrant environment.
    * Some bots require Python 3. Try switching to a Python 3 environment before running
      your bot.

## Future direction

The long-term plan for this bot system is to allow the same
`ExternalBotHandler` code to eventually be usable in several contexts:

* Run directly using the Zulip `call_on_each_message` API, which is
  how the implementation above works.  This is great for quick
  development with minimal setup.
* Run in a simple Python webserver server, processing messages
  received from Zulip's outgoing webhooks integration.
* For bots merged into the mainline Zulip codebase, enabled via a
  button in the Zulip web UI, with no code deployment effort required.
