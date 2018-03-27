# Django settings for zulip project.
########################################################################
# Here's how settings for the Zulip project work:
#
# * settings.py contains non-site-specific and settings configuration
# for the Zulip Django app.
# * settings.py imports prod_settings.py, and any site-specific configuration
# belongs there.  The template for prod_settings.py is prod_settings_template.py
#
# See http://zulip.readthedocs.io/en/latest/settings.html for more information
#
########################################################################
from copy import deepcopy
import os
import platform
import time
import sys
import six.moves.configparser

from zerver.lib.db import TimeTrackingConnection
import zerver.lib.logging_util

########################################################################
# INITIAL SETTINGS
########################################################################

DEPLOY_ROOT = os.path.join(os.path.realpath(os.path.dirname(__file__)), '..')

config_file = six.moves.configparser.RawConfigParser()
config_file.read("/etc/zulip/zulip.conf")

# Whether this instance of Zulip is running in a production environment.
PRODUCTION = config_file.has_option('machine', 'deploy_type')
DEVELOPMENT = not PRODUCTION

secrets_file = six.moves.configparser.RawConfigParser()
if PRODUCTION:
    secrets_file.read("/etc/zulip/zulip-secrets.conf")
else:
    secrets_file.read(os.path.join(DEPLOY_ROOT, "zproject/dev-secrets.conf"))

def get_secret(key):
    # type: (str) -> None
    if secrets_file.has_option('secrets', key):
        return secrets_file.get('secrets', key)
    return None

# Make this unique, and don't share it with anybody.
SECRET_KEY = get_secret("secret_key")

# A shared secret, used to authenticate different parts of the app to each other.
SHARED_SECRET = get_secret("shared_secret")

# We use this salt to hash a user's email into a filename for their user-uploaded
# avatar.  If this salt is discovered, attackers will only be able to determine
# that the owner of an email account has uploaded an avatar to Zulip, which isn't
# the end of the world.  Don't use the salt where there is more security exposure.
AVATAR_SALT = get_secret("avatar_salt")

# SERVER_GENERATION is used to track whether the server has been
# restarted for triggering browser clients to reload.
SERVER_GENERATION = int(time.time())

# Key to authenticate this server to zulip.org for push notifications, etc.
ZULIP_ORG_KEY = get_secret("zulip_org_key")
ZULIP_ORG_ID = get_secret("zulip_org_id")

if 'DEBUG' not in globals():
    # Uncomment end of next line to test CSS minification.
    # For webpack JS minification use tools/run_dev.py --minify
    DEBUG = DEVELOPMENT  # and platform.node() != 'your-machine'

if DEBUG:
    INTERNAL_IPS = ('127.0.0.1',)

# Detect whether we're running as a queue worker; this impacts the logging configuration.
if len(sys.argv) > 2 and sys.argv[0].endswith('manage.py') and sys.argv[1] == 'process_queue':
    IS_WORKER = True
else:
    IS_WORKER = False


# This is overridden in test_settings.py for the test suites
TEST_SUITE = False
# The new user tutorial is enabled by default, but disabled for client tests.
TUTORIAL_ENABLED = True
# This is overridden in test_settings.py for the test suites
CASPER_TESTS = False

# Google Compute Engine has an /etc/boto.cfg that is "nicely
# configured" to work with GCE's storage service.  However, their
# configuration is super aggressive broken, in that it means importing
# boto in a virtualenv that doesn't contain the GCE tools crashes.
#
# By using our own path for BOTO_CONFIG, we can cause boto to not
# process /etc/boto.cfg.
os.environ['BOTO_CONFIG'] = '/etc/zulip/boto.cfg'

# Import variables like secrets from the prod_settings file
# Import prod_settings after determining the deployment/machine type
if PRODUCTION:
    from .prod_settings import *
else:
    from .dev_settings import *

########################################################################
# DEFAULT VALUES FOR SETTINGS
########################################################################

# For any settings that are not set in the site-specific configuration file
# (/etc/zulip/settings.py in production, or dev_settings.py or test_settings.py
# in dev and test), we want to initialize them to sane defaults.

# These settings are intended for the server admin to set.  We document them in
# prod_settings_template.py, and in the initial /etc/zulip/settings.py on a new
# install of the Zulip server.
DEFAULT_SETTINGS = {
    # Basic email settings
    'EMAIL_HOST': None,
    'NOREPLY_EMAIL_ADDRESS': "noreply@" + EXTERNAL_HOST.split(":")[0],
    'PHYSICAL_ADDRESS': '',

    # Google auth
    'GOOGLE_OAUTH2_CLIENT_ID': None,

    # LDAP auth
    'AUTH_LDAP_SERVER_URI': "",
    'LDAP_EMAIL_ATTR': None,

    # Social auth
    'SOCIAL_AUTH_GITHUB_KEY': None,
    'SOCIAL_AUTH_GITHUB_ORG_NAME': None,
    'SOCIAL_AUTH_GITHUB_TEAM_ID': None,

    # Email gateway
    'EMAIL_GATEWAY_PATTERN': '',
    'EMAIL_GATEWAY_LOGIN': None,
    'EMAIL_GATEWAY_IMAP_SERVER': None,
    'EMAIL_GATEWAY_IMAP_PORT': None,
    'EMAIL_GATEWAY_IMAP_FOLDER': None,
    # Not documented for in /etc/zulip/settings.py, since it's rarely needed.
    'EMAIL_GATEWAY_EXTRA_PATTERN_HACK': None,

    # Error reporting
    'ERROR_REPORTING': True,
    'BROWSER_ERROR_REPORTING': False,
    'LOGGING_SHOW_MODULE': False,
    'LOGGING_SHOW_PID': False,

    # File uploads and avatars
    'DEFAULT_AVATAR_URI': '/static/images/default-avatar.png',
    'S3_AVATAR_BUCKET': '',
    'LOCAL_UPLOADS_DIR': None,
    'MAX_FILE_UPLOAD_SIZE': 25,

    # Feedback bot settings
    'ENABLE_FEEDBACK': PRODUCTION,
    'FEEDBACK_EMAIL': None,

    # External service configuration
    'CAMO_URI': '',
    'MEMCACHED_LOCATION': '127.0.0.1:11211',
    'RABBITMQ_HOST': 'localhost',
    'RABBITMQ_USERNAME': 'zulip',
    'REDIS_HOST': '127.0.0.1',
    'REDIS_PORT': 6379,
    'REMOTE_POSTGRES_HOST': '',
    'REMOTE_POSTGRES_SSLMODE': '',

    # ToS/Privacy templates
    'PRIVACY_POLICY': None,
    'TERMS_OF_SERVICE': None,

    # Security
    'ENABLE_FILE_LINKS': False,
    'ENABLE_GRAVATAR': True,
    'INLINE_IMAGE_PREVIEW': True,
    'INLINE_URL_EMBED_PREVIEW': False,
    'NAME_CHANGES_DISABLED': False,
    'PASSWORD_MIN_LENGTH': 6,
    'PASSWORD_MIN_GUESSES': 10000,
    'PUSH_NOTIFICATION_BOUNCER_URL': None,
    'PUSH_NOTIFICATION_REDACT_CONTENT': False,
    'RATE_LIMITING': True,
    'SEND_LOGIN_EMAILS': True,
}

# These settings are not documented in prod_settings_template.py.
# They should either be documented here, or documented there.
#
# Settings that it makes sense to document here instead of in
# prod_settings_template.py are those that
#  * don't make sense to change in production, but rather are intended
#    for dev and test environments; or
#  * don't make sense to change on a typical production server with
#    one or a handful of realms, though they might on an installation
#    like zulipchat.com or to work around a problem on another server.
DEFAULT_SETTINGS.update({

    # The following bots are optional system bots not enabled by
    # default.  The default ones are defined in INTERNAL_BOTS, below.

    # ERROR_BOT sends Django exceptions to an "errors" stream in the
    # system realm.
    'ERROR_BOT': None,
    # NEW_USER_BOT sends notifications about new user signups to a
    # "signups" stream in the system realm.
    'NEW_USER_BOT': None,
    # These are extra bot users for our end-to-end Nagios message
    # sending tests.
    'NAGIOS_STAGING_SEND_BOT': None,
    'NAGIOS_STAGING_RECEIVE_BOT': None,
    # Feedback bot, messages sent to it are by default emailed to
    # FEEDBACK_EMAIL (see above), but can be sent to a stream,
    # depending on configuration.
    'FEEDBACK_BOT': 'feedback@zulip.com',
    'FEEDBACK_BOT_NAME': 'Zulip Feedback Bot',
    'FEEDBACK_STREAM': None,

    # Structurally, we will probably eventually merge
    # analytics into part of the main server, rather
    # than a separate app.
    'EXTRA_INSTALLED_APPS': ['analytics'],

    # Default GOOGLE_CLIENT_ID to the value needed for Android auth to work
    'GOOGLE_CLIENT_ID': '835904834568-77mtr5mtmpgspj9b051del9i9r5t4g4n.apps.googleusercontent.com',

    # Legacy event logs configuration.  Our plans include removing
    # log_event entirely in favor of RealmAuditLog, at which point we
    # can remove this setting.
    'EVENT_LOGS_ENABLED': False,

    # Used to construct URLs to point to the Zulip server.  Since we
    # only support HTTPS in production, this is just for development.
    'EXTERNAL_URI_SCHEME': "https://",

    # Whether anyone can create a new organization on the Zulip server.
    'OPEN_REALM_CREATION': False,

    # Setting for where the system bot users are.  Likely has no
    # purpose now that the REALMS_HAVE_SUBDOMAINS migration is finished.
    'SYSTEM_ONLY_REALMS': {"zulip"},

    # Whether the server is using the Pgroonga full-text search
    # backend.  Plan is to turn this on for everyone after further
    # testing.
    'USING_PGROONGA': False,

    # How Django should send emails.  Set for most contexts below, but
    # available for sysadmin override in unusual cases.
    'EMAIL_BACKEND': None,

    # Whether to keep extra frontend stack trace data.
    # TODO: Investigate whether this should be removed and set one way or other.
    'SAVE_FRONTEND_STACKTRACES': False,

    # Whether to flush memcached after data migrations.  Because of
    # how we do deployments in a way that avoids reusing memcached,
    # this is disabled in production, but we need it in development.
    'POST_MIGRATION_CACHE_FLUSHING': False,

    # Settings for APNS.  Only needed on push.zulipchat.com.
    'APNS_CERT_FILE': None,
    'APNS_KEY_FILE': None,
    'APNS_SANDBOX': True,

    # Limits related to the size of file uploads; last few in MB.
    'DATA_UPLOAD_MAX_MEMORY_SIZE': 25 * 1024 * 1024,
    'MAX_AVATAR_FILE_SIZE': 5,
    'MAX_ICON_FILE_SIZE': 5,
    'MAX_EMOJI_FILE_SIZE': 5,

    # Controls for which links are published in portico footers/headers/etc.
    'EMAIL_DELIVERER_DISABLED': False,
    'REGISTER_LINK_DISABLED': None,
    'LOGIN_LINK_DISABLED': False,
    'ABOUT_LINK_DISABLED': False,
    'FIND_TEAM_LINK_DISABLED': True,

    # What domains to treat like the root domain
    'ROOT_SUBDOMAIN_ALIASES': ["www"],
    # Whether the root domain is a landing page or can host a realm.
    'ROOT_DOMAIN_LANDING_PAGE': False,

    # If using the Zephyr mirroring supervisord configuration, the
    # hostname to connect to in order to transfer credentials from webathena.
    'PERSONAL_ZMIRROR_SERVER': None,

    # When security-relevant links in emails expire.
    'CONFIRMATION_LINK_DEFAULT_VALIDITY_DAYS': 1,
    'INVITATION_LINK_VALIDITY_DAYS': 10,
    'REALM_CREATION_LINK_VALIDITY_DAYS': 7,

    # By default, Zulip uses websockets to send messages.  In some
    # networks, websockets don't work.  One can configure Zulip to
    # not use websockets here.
    'USE_WEBSOCKETS': True,

    # Version number for ToS.  Change this if you want to force every
    # user to click through to re-accept terms of service before using
    # Zulip again on the web.
    'TOS_VERSION': None,
    # Template to use when bumping TOS_VERSION to explain situation.
    'FIRST_TIME_TOS_TEMPLATE': None,

    # Hostname used for Zulip's statsd logging integration.
    'STATSD_HOST': '',

    # Configuration for JWT auth.
    'JWT_AUTH_KEYS': {},

    # https://docs.djangoproject.com/en/1.11/ref/settings/#std:setting-SERVER_EMAIL
    # Django setting for what from address to use in error emails.  We
    # set this to ZULIP_ADMINISTRATOR by default.
    'SERVER_EMAIL': None,
    # Django setting for who receives error emails.  We set to
    # ZULIP_ADMINISTRATOR by default.
    'ADMINS': '',

    # From address for welcome emails.
    'WELCOME_EMAIL_SENDER': None,
    # Whether we should use users' own email addresses as the from
    # address when sending missed-message emails.  Off by default
    # because some transactional email providers reject sending such
    # emails since they can look like spam.
    'SEND_MISSED_MESSAGE_EMAILS_AS_USER': False,

    # Used to change the Zulip logo in portico pages.
    'CUSTOM_LOGO_URL': None,

    # Random salt used when deterministically generating passwords in
    # development.
    'INITIAL_PASSWORD_SALT': None,

    # Used to control whether certain management commands are run on
    # the server.
    # TODO: Replace this with a smarter "run on only one server" system.
    'STAGING': False,
    # Configuration option for our email/Zulip error reporting.
    'STAGING_ERROR_NOTIFICATIONS': False,

    # How long to wait before presence should treat a user as offline.
    # TODO: Figure out why this is different from the corresponding
    # value in static/js/presence.js.  Also, probably move it out of
    # DEFAULT_SETTINGS, since it likely isn't usefully user-configurable.
    'OFFLINE_THRESHOLD_SECS': 5 * 60,
})


for setting_name, setting_val in DEFAULT_SETTINGS.items():
    if setting_name not in vars():
        vars()[setting_name] = setting_val

# Extend ALLOWED_HOSTS with localhost (needed to RPC to Tornado).
ALLOWED_HOSTS += ['127.0.0.1', 'localhost']

# These are the settings that we will check that the user has filled in for
# production deployments before starting the app.  It consists of a series
# of pairs of (setting name, default value that it must be changed from)
REQUIRED_SETTINGS = [("EXTERNAL_HOST", "zulip.example.com"),
                     ("ZULIP_ADMINISTRATOR", "zulip-admin@example.com"),
                     # SECRET_KEY doesn't really need to be here, in
                     # that we set it automatically, but just in
                     # case, it seems worth having in this list
                     ("SECRET_KEY", ""),
                     ("AUTHENTICATION_BACKENDS", ()),
                     ]

if ADMINS == "":
    ADMINS = (("Zulip Administrator", ZULIP_ADMINISTRATOR),)
MANAGERS = ADMINS

########################################################################
# STANDARD DJANGO SETTINGS
########################################################################

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'UTC'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

# The ID, as an integer, of the current site in the django_site database table.
# This is used so that application data can hook into specific site(s) and a
# single database can manage content for multiple sites.
#
# We set this site's string_id to 'zulip' in populate_db.
SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

DEPLOY_ROOT = os.path.join(os.path.realpath(os.path.dirname(__file__)), '..')
# this directory will be used to store logs for development environment
DEVELOPMENT_LOG_DIRECTORY = os.path.join(DEPLOY_ROOT, 'var', 'log')
# Make redirects work properly behind a reverse proxy
USE_X_FORWARDED_HOST = True

MIDDLEWARE = (
    # With the exception of it's dependencies,
    # our logging middleware should be the top middleware item.
    'zerver.middleware.TagRequests',
    'zerver.middleware.SetRemoteAddrFromForwardedFor',
    'zerver.middleware.LogRequests',
    'zerver.middleware.JsonErrorHandler',
    'zerver.middleware.RateLimitMiddleware',
    'zerver.middleware.FlushDisplayRecipientCache',
    'django.middleware.common.CommonMiddleware',
    'zerver.middleware.SessionHostDomainMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

ANONYMOUS_USER_ID = None

AUTH_USER_MODEL = "zerver.UserProfile"

TEST_RUNNER = 'zerver.lib.test_runner.Runner'

ROOT_URLCONF = 'zproject.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'zproject.wsgi.application'

# A site can include additional installed apps via the
# EXTRA_INSTALLED_APPS setting
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.staticfiles',
    'confirmation',
    'pipeline',
    'webpack_loader',
    'zerver',
    'social_django',
]
if USING_PGROONGA:
    INSTALLED_APPS += ['pgroonga']
INSTALLED_APPS += EXTRA_INSTALLED_APPS

ZILENCER_ENABLED = 'zilencer' in INSTALLED_APPS

# Base URL of the Tornado server
# We set it to None when running backend tests or populate_db.
# We override the port number when running frontend tests.
TORNADO_SERVER = 'http://127.0.0.1:9993'
RUNNING_INSIDE_TORNADO = False
AUTORELOAD = DEBUG

########################################################################
# DATABASE CONFIGURATION
########################################################################

DATABASES = {"default": {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': 'zulip',
    'USER': 'zulip',
    'PASSWORD': '',  # Authentication done via certificates
    'HOST': '',  # Host = '' => connect through a local socket
    'SCHEMA': 'zulip',
    'CONN_MAX_AGE': 600,
    'OPTIONS': {
        'connection_factory': TimeTrackingConnection
    },
}}

if DEVELOPMENT:
    LOCAL_DATABASE_PASSWORD = get_secret("local_database_password")
    DATABASES["default"].update({
        'PASSWORD': LOCAL_DATABASE_PASSWORD,
        'HOST': 'localhost'
    })
elif REMOTE_POSTGRES_HOST != '':
    DATABASES['default'].update({
        'HOST': REMOTE_POSTGRES_HOST,
    })
    if get_secret("postgres_password") is not None:
        DATABASES['default'].update({
            'PASSWORD': get_secret("postgres_password"),
        })
    if REMOTE_POSTGRES_SSLMODE != '':
        DATABASES['default']['OPTIONS']['sslmode'] = REMOTE_POSTGRES_SSLMODE
    else:
        DATABASES['default']['OPTIONS']['sslmode'] = 'verify-full'

if USING_PGROONGA:
    # We need to have "pgroonga" schema before "pg_catalog" schema in
    # the PostgreSQL search path, because "pgroonga" schema overrides
    # the "@@" operator from "pg_catalog" schema, and "pg_catalog"
    # schema is searched first if not specified in the search path.
    # See also: http://www.postgresql.org/docs/current/static/runtime-config-client.html
    pg_options = '-c search_path=%(SCHEMA)s,zulip,public,pgroonga,pg_catalog' % \
        DATABASES['default']
    DATABASES['default']['OPTIONS']['options'] = pg_options

########################################################################
# RABBITMQ CONFIGURATION
########################################################################

USING_RABBITMQ = True
RABBITMQ_PASSWORD = get_secret("rabbitmq_password")

########################################################################
# CACHING CONFIGURATION
########################################################################

SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
        'LOCATION': MEMCACHED_LOCATION,
        'TIMEOUT': 3600,
        'OPTIONS': {
            'verify_keys': True,
            'tcp_nodelay': True,
            'retry_timeout': 1,
        }
    },
    'database': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'third_party_api_results',
        # This cache shouldn't timeout; we're really just using the
        # cache API to store the results of requests to third-party
        # APIs like the Twitter API permanently.
        'TIMEOUT': None,
        'OPTIONS': {
            'MAX_ENTRIES': 100000000,
            'CULL_FREQUENCY': 10,
        }
    },
}

########################################################################
# REDIS-BASED RATE LIMITING CONFIGURATION
########################################################################

RATE_LIMITING_RULES = [
    (60, 100),  # 100 requests max every minute
]
DEBUG_RATE_LIMITING = DEBUG
REDIS_PASSWORD = get_secret('redis_password')

########################################################################
# SECURITY SETTINGS
########################################################################

# Tell the browser to never send our cookies without encryption, e.g.
# when executing the initial http -> https redirect.
#
# Turn it off for local testing because we don't have SSL.
if PRODUCTION:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

try:
    # For get_updates hostname sharding.
    domain = config_file.get('django', 'cookie_domain')
    CSRF_COOKIE_DOMAIN = '.' + domain
except six.moves.configparser.Error:
    # Failing here is OK
    pass

# Prevent Javascript from reading the CSRF token from cookies.  Our code gets
# the token from the DOM, which means malicious code could too.  But hiding the
# cookie will slow down some attackers.
CSRF_COOKIE_PATH = '/;HttpOnly'
CSRF_FAILURE_VIEW = 'zerver.middleware.csrf_failure'

if DEVELOPMENT:
    # Use fast password hashing for creating testing users when not
    # PRODUCTION.  Saves a bunch of time.
    PASSWORD_HASHERS = (
        'django.contrib.auth.hashers.SHA1PasswordHasher',
        'django.contrib.auth.hashers.PBKDF2PasswordHasher'
    )
    # Also we auto-generate passwords for the default users which you
    # can query using ./manage.py print_initial_password
    INITIAL_PASSWORD_SALT = get_secret("initial_password_salt")
else:
    # For production, use the best password hashing algorithm: Argon2
    # Zulip was originally on PBKDF2 so we need it for compatibility
    PASSWORD_HASHERS = ('django.contrib.auth.hashers.Argon2PasswordHasher',
                        'django.contrib.auth.hashers.PBKDF2PasswordHasher')

########################################################################
# API/BOT SETTINGS
########################################################################

if "EXTERNAL_API_PATH" not in vars():
    EXTERNAL_API_PATH = EXTERNAL_HOST + "/api"
EXTERNAL_API_URI = EXTERNAL_URI_SCHEME + EXTERNAL_API_PATH
ROOT_DOMAIN_URI = EXTERNAL_URI_SCHEME + EXTERNAL_HOST

if "NAGIOS_BOT_HOST" not in vars():
    NAGIOS_BOT_HOST = EXTERNAL_HOST

S3_KEY = get_secret("s3_key")
S3_SECRET_KEY = get_secret("s3_secret_key")

# GCM tokens are IP-whitelisted; if we deploy to additional
# servers you will need to explicitly add their IPs here:
# https://cloud.google.com/console/project/apps~zulip-android/apiui/credential
ANDROID_GCM_API_KEY = get_secret("android_gcm_api_key")

GOOGLE_OAUTH2_CLIENT_SECRET = get_secret('google_oauth2_client_secret')

DROPBOX_APP_KEY = get_secret("dropbox_app_key")

MAILCHIMP_API_KEY = get_secret("mailchimp_api_key")

# Twitter API credentials
# Secrecy not required because its only used for R/O requests.
# Please don't make us go over our rate limit.
TWITTER_CONSUMER_KEY = get_secret("twitter_consumer_key")
TWITTER_CONSUMER_SECRET = get_secret("twitter_consumer_secret")
TWITTER_ACCESS_TOKEN_KEY = get_secret("twitter_access_token_key")
TWITTER_ACCESS_TOKEN_SECRET = get_secret("twitter_access_token_secret")

# These are the bots that Zulip sends automated messages as.
INTERNAL_BOTS = [{'var_name': 'NOTIFICATION_BOT',
                  'email_template': 'notification-bot@%s',
                  'name': 'Notification Bot'},
                 {'var_name': 'EMAIL_GATEWAY_BOT',
                  'email_template': 'emailgateway@%s',
                  'name': 'Email Gateway'},
                 {'var_name': 'NAGIOS_SEND_BOT',
                  'email_template': 'nagios-send-bot@%s',
                  'name': 'Nagios Send Bot'},
                 {'var_name': 'NAGIOS_RECEIVE_BOT',
                  'email_template': 'nagios-receive-bot@%s',
                  'name': 'Nagios Receive Bot'},
                 {'var_name': 'WELCOME_BOT',
                  'email_template': 'welcome-bot@%s',
                  'name': 'Welcome Bot'}]

if PRODUCTION:
    INTERNAL_BOTS += [
        {'var_name': 'NAGIOS_STAGING_SEND_BOT',
         'email_template': 'nagios-staging-send-bot@%s',
         'name': 'Nagios Staging Send Bot'},
        {'var_name': 'NAGIOS_STAGING_RECEIVE_BOT',
         'email_template': 'nagios-staging-receive-bot@%s',
         'name': 'Nagios Staging Receive Bot'},
    ]

INTERNAL_BOT_DOMAIN = "zulip.com"

# Set the realm-specific bot names
for bot in INTERNAL_BOTS:
    if vars().get(bot['var_name']) is None:
        bot_email = bot['email_template'] % (INTERNAL_BOT_DOMAIN,)
        vars()[bot['var_name']] = bot_email

if EMAIL_GATEWAY_PATTERN != "":
    EMAIL_GATEWAY_EXAMPLE = EMAIL_GATEWAY_PATTERN % ("support+abcdefg",)
else:
    EMAIL_GATEWAY_EXAMPLE = ""

########################################################################
# STATSD CONFIGURATION
########################################################################

# Statsd is not super well supported; if you want to use it you'll need
# to set STATSD_HOST and STATSD_PREFIX.
if STATSD_HOST != '':
    INSTALLED_APPS += ['django_statsd']
    STATSD_PORT = 8125
    STATSD_CLIENT = 'django_statsd.clients.normal'

########################################################################
# CAMO HTTPS CACHE CONFIGURATION
########################################################################

if CAMO_URI != '':
    # This needs to be synced with the Camo installation
    CAMO_KEY = get_secret("camo_key")

########################################################################
# STATIC CONTENT AND MINIFICATION SETTINGS
########################################################################

STATIC_URL = '/static/'

# ZulipStorage is a modified version of PipelineCachedStorage,
# and, like that class, it inserts a file hash into filenames
# to prevent the browser from using stale files from cache.
#
# Unlike PipelineStorage, it requires the files to exist in
# STATIC_ROOT even for dev servers.  So we only use
# ZulipStorage when not DEBUG.

# This is the default behavior from Pipeline, but we set it
# here so that urls.py can read it.
PIPELINE_ENABLED = not DEBUG

if DEBUG:
    STATICFILES_STORAGE = 'pipeline.storage.PipelineStorage'
    STATICFILES_FINDERS = (
        'django.contrib.staticfiles.finders.AppDirectoriesFinder',
        'pipeline.finders.PipelineFinder',
    )
    if PIPELINE_ENABLED:
        STATIC_ROOT = os.path.abspath('prod-static/serve')
    else:
        STATIC_ROOT = os.path.abspath('static/')
else:
    STATICFILES_STORAGE = 'zerver.storage.ZulipStorage'
    STATICFILES_FINDERS = (
        'django.contrib.staticfiles.finders.FileSystemFinder',
        'pipeline.finders.PipelineFinder',
    )
    if PRODUCTION:
        STATIC_ROOT = '/home/zulip/prod-static'
    else:
        STATIC_ROOT = os.path.abspath('prod-static/serve')

# If changing this, you need to also the hack modifications to this in
# our compilemessages management command.
LOCALE_PATHS = (os.path.join(STATIC_ROOT, 'locale'),)

# We want all temporary uploaded files to be stored on disk.
FILE_UPLOAD_MAX_MEMORY_SIZE = 0

STATICFILES_DIRS = ['static/']
STATIC_HEADER_FILE = 'zerver/static_header.txt'

# To use minified files in dev, set PIPELINE_ENABLED = True.  For the full
# cache-busting behavior, you must also set DEBUG = False.
#
# You will need to run update-prod-static after changing
# static files.
#
# Useful reading on how this works is in
# https://zulip.readthedocs.io/en/latest/front-end-build-process.html

PIPELINE = {
    'PIPELINE_ENABLED': PIPELINE_ENABLED,
    'CSS_COMPRESSOR': 'pipeline.compressors.yui.YUICompressor',
    'YUI_BINARY': '/usr/bin/env yui-compressor',
    'STYLESHEETS': {
        # If you add a style here, please update stylesheets()
        # in frontend_tests/zjsunit/output.js as needed.
        'activity': {
            'source_filenames': ('styles/activity.css',),
            'output_filename': 'min/activity.css'
        },
        'stats': {
            'source_filenames': ('styles/stats.css',),
            'output_filename': 'min/stats.css'
        },
        'portico': {
            'source_filenames': (
                'third/zocial/zocial.css',
                'styles/components.css',
                'styles/portico.css',
                'styles/portico-signin.css',
                'styles/pygments.css',
                'third/thirdparty-fonts.css',
                'styles/fonts.css',
            ),
            'output_filename': 'min/portico.css'
        },
        'landing-page': {
            'source_filenames': (
                'styles/landing-page.css',
            ),
            'output_filename': 'min/landing.css'
        },
        # Two versions of the app CSS exist because of QTBUG-3467
        'app-fontcompat': {
            'source_filenames': (
                'third/bootstrap-notify/css/bootstrap-notify.css',
                'third/spectrum/spectrum.css',
                'third/thirdparty-fonts.css',
                'styles/components.css',
                'styles/app_components.css',
                'styles/zulip.css',
                'styles/alerts.css',
                'styles/settings.css',
                'styles/subscriptions.css',
                'styles/drafts.css',
                'styles/informational-overlays.css',
                'styles/compose.css',
                'styles/reactions.css',
                'styles/left-sidebar.css',
                'styles/right-sidebar.css',
                'styles/lightbox.css',
                'styles/popovers.css',
                'styles/pygments.css',
                'styles/media.css',
                'styles/typing_notifications.css',
                'styles/hotspots.css',
                # We don't want fonts.css on QtWebKit, so its omitted here
            ),
            'output_filename': 'min/app-fontcompat.css'
        },
        'app': {
            'source_filenames': (
                'third/bootstrap-notify/css/bootstrap-notify.css',
                'third/spectrum/spectrum.css',
                'third/thirdparty-fonts.css',
                'node_modules/katex/dist/katex.css',
                'styles/components.css',
                'styles/app_components.css',
                'styles/zulip.css',
                'styles/alerts.css',
                'styles/settings.css',
                'styles/subscriptions.css',
                'styles/drafts.css',
                'styles/informational-overlays.css',
                'styles/compose.css',
                'styles/reactions.css',
                'styles/left-sidebar.css',
                'styles/right-sidebar.css',
                'styles/lightbox.css',
                'styles/popovers.css',
                'styles/pygments.css',
                'styles/fonts.css',
                'styles/media.css',
                'styles/typing_notifications.css',
                'styles/hotspots.css',
            ),
            'output_filename': 'min/app.css'
        },
        'common': {
            'source_filenames': (
                'third/bootstrap/css/bootstrap.css',
                'third/bootstrap/css/bootstrap-btn.css',
                'third/bootstrap/css/bootstrap-responsive.css',
                'node_modules/perfect-scrollbar/dist/css/perfect-scrollbar.css',
            ),
            'output_filename': 'min/common.css'
        },
        'apple_sprite': {
            'source_filenames': (
                'generated/emoji/google_sprite.css',
            ),
            'output_filename': 'min/google_sprite.css',
        },
        'emojione_sprite': {
            'source_filenames': (
                'generated/emoji/google_sprite.css',
            ),
            'output_filename': 'min/google_sprite.css',
        },
        'google_sprite': {
            'source_filenames': (
                'generated/emoji/google_sprite.css',
            ),
            'output_filename': 'min/google_sprite.css',
        },
        'twitter_sprite': {
            'source_filenames': (
                'generated/emoji/google_sprite.css',
            ),
            'output_filename': 'min/google_sprite.css',
        },
    },
    'JAVASCRIPT': {},
}

# Useful reading on how this works is in
# https://zulip.readthedocs.io/en/latest/front-end-build-process.html
JS_SPECS = {
    'app': {
        'source_filenames': [
            'third/bootstrap-notify/js/bootstrap-notify.js',
            'third/html5-formdata/formdata.js',
            'node_modules/jquery-validation/dist/jquery.validate.js',
            'node_modules/clipboard/dist/clipboard.js',
            'third/jquery-form/jquery.form.js',
            'third/jquery-filedrop/jquery.filedrop.js',
            'third/jquery-caret/jquery.caret.1.5.2.js',
            'node_modules/xdate/src/xdate.js',
            'third/jquery-throttle-debounce/jquery.ba-throttle-debounce.js',
            'third/jquery-idle/jquery.idle.js',
            'third/jquery-autosize/jquery.autosize.js',
            'node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.jquery.js',
            'third/lazyload/lazyload.js',
            'third/spectrum/spectrum.js',
            'third/sockjs/sockjs-0.3.4.js',
            'node_modules/string.prototype.codepointat/codepointat.js',
            'node_modules/winchan/winchan.js',
            'node_modules/handlebars/dist/handlebars.runtime.js',
            'third/marked/lib/marked.js',
            'generated/emoji/emoji_codes.js',
            'generated/pygments_data.js',
            'templates/compiled.js',
            'js/feature_flags.js',
            'js/loading.js',
            'js/util.js',
            'js/dynamic_text.js',
            'js/lightbox_canvas.js',
            'js/rtl.js',
            'js/dict.js',
            'js/components.js',
            'js/localstorage.js',
            'js/drafts.js',
            'js/channel.js',
            'js/setup.js',
            'js/unread_ui.js',
            'js/unread_ops.js',
            'js/muting.js',
            'js/muting_ui.js',
            'js/message_viewport.js',
            'js/rows.js',
            'js/people.js',
            'js/unread.js',
            'js/topic_list.js',
            'js/pm_list.js',
            'js/pm_conversations.js',
            'js/recent_senders.js',
            'js/stream_sort.js',
            'js/topic_generator.js',
            'js/top_left_corner.js',
            'js/stream_list.js',
            'js/filter.js',
            'js/message_list_view.js',
            'js/message_list.js',
            'js/message_live_update.js',
            'js/narrow_state.js',
            'js/narrow.js',
            'js/reload.js',
            'js/compose_fade.js',
            'js/fenced_code.js',
            'js/markdown.js',
            'js/echo.js',
            'js/socket.js',
            'js/sent_messages.js',
            'js/compose_state.js',
            'js/compose_actions.js',
            'js/compose.js',
            'js/stream_color.js',
            'js/stream_data.js',
            'js/topic_data.js',
            'js/stream_muting.js',
            'js/stream_events.js',
            'js/stream_create.js',
            'js/stream_edit.js',
            'js/subs.js',
            'js/message_edit.js',
            'js/condense.js',
            'js/resize.js',
            'js/list_render.js',
            'js/floating_recipient_bar.js',
            'js/lightbox.js',
            'js/ui_report.js',
            'js/ui.js',
            'js/ui_util.js',
            'js/pointer.js',
            'js/click_handlers.js',
            'js/scroll_bar.js',
            'js/gear_menu.js',
            'js/copy_and_paste.js',
            'js/stream_popover.js',
            'js/popovers.js',
            'js/overlays.js',
            'js/typeahead_helper.js',
            'js/search_suggestion.js',
            'js/search.js',
            'js/composebox_typeahead.js',
            'js/navigate.js',
            'js/list_util.js',
            'js/hotkey.js',
            'js/favicon.js',
            'js/notifications.js',
            'js/hash_util.js',
            'js/hashchange.js',
            'js/invite.js',
            'js/message_flags.js',
            'js/alert_words.js',
            'js/alert_words_ui.js',
            'js/attachments_ui.js',
            'js/message_store.js',
            'js/message_util.js',
            'js/message_events.js',
            'js/message_fetch.js',
            'js/server_events.js',
            'js/server_events_dispatch.js',
            'js/zulip.js',
            'js/presence.js',
            'js/activity.js',
            'js/user_events.js',
            'js/colorspace.js',
            'js/timerender.js',
            'js/tutorial.js',
            'js/hotspots.js',
            'js/templates.js',
            'js/upload_widget.js',
            'js/avatar.js',
            'js/realm_icon.js',
            'js/settings_account.js',
            'js/settings_display.js',
            'js/settings_notifications.js',
            'js/settings_bots.js',
            'js/settings_muting.js',
            'js/settings_lab.js',
            'js/settings_sections.js',
            'js/settings_emoji.js',
            'js/settings_org.js',
            'js/settings_users.js',
            'js/settings_streams.js',
            'js/settings_filters.js',
            'js/settings.js',
            'js/admin_sections.js',
            'js/admin.js',
            'js/tab_bar.js',
            'js/emoji.js',
            'js/custom_markdown.js',
            'js/bot_data.js',
            'js/reactions.js',
            'js/typing.js',
            'js/typing_status.js',
            'js/typing_data.js',
            'js/typing_events.js',
            'js/ui_init.js',
            'js/emoji_picker.js',
            'js/compose_ui.js',
            'js/desktop_notifications_panel.js'
        ],
        'output_filename': 'min/app.js'
    },
    # We also want to minify sockjs separately for the sockjs iframe transport
    'sockjs': {
        'source_filenames': ['third/sockjs/sockjs-0.3.4.js'],
        'output_filename': 'min/sockjs-0.3.4.min.js'
    }
}

app_srcs = JS_SPECS['app']['source_filenames']
if DEVELOPMENT:
    WEBPACK_STATS_FILE = os.path.join('var', 'webpack-stats-dev.json')
else:
    WEBPACK_STATS_FILE = 'webpack-stats-production.json'
WEBPACK_LOADER = {
    'DEFAULT': {
        'BUNDLE_DIR_NAME': 'webpack-bundles/',
        'STATS_FILE': os.path.join(DEPLOY_ROOT, WEBPACK_STATS_FILE),
    }
}

########################################################################
# TEMPLATES SETTINGS
########################################################################

# List of callables that know how to import templates from various sources.
LOADERS = [
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
]
if PRODUCTION:
    # Template caching is a significant performance win in production.
    LOADERS = [('django.template.loaders.cached.Loader', LOADERS)]

base_template_engine_settings = {
    'BACKEND': 'django.template.backends.jinja2.Jinja2',
    'OPTIONS': {
        'environment': 'zproject.jinja2.environment',
        'extensions': [
            'jinja2.ext.i18n',
            'jinja2.ext.autoescape',
            'pipeline.jinja2.PipelineExtension',
            'webpack_loader.contrib.jinja2ext.WebpackExtension',
        ],
        'context_processors': [
            'zerver.context_processors.zulip_default_context',
            'zerver.context_processors.add_metrics',
            'django.template.context_processors.i18n',
        ],
    },
}

default_template_engine_settings = deepcopy(base_template_engine_settings)
default_template_engine_settings.update({
    'NAME': 'Jinja2',
    'DIRS': [
        # The main templates directory
        os.path.join(DEPLOY_ROOT, 'templates'),
        # The webhook integration templates
        os.path.join(DEPLOY_ROOT, 'zerver', 'webhooks'),
        # The python-zulip-api:zulip_bots package templates
        os.path.join(STATIC_ROOT, 'generated', 'bots'),
    ],
    'APP_DIRS': True,
})

non_html_template_engine_settings = deepcopy(base_template_engine_settings)
non_html_template_engine_settings.update({
    'NAME': 'Jinja2_plaintext',
    'DIRS': [os.path.join(DEPLOY_ROOT, 'templates')],
    'APP_DIRS': False,
})
non_html_template_engine_settings['OPTIONS'].update({
    'autoescape': False,
    'trim_blocks': True,
    'lstrip_blocks': True,
})

# The order here is important; get_template and related/parent functions try
# the template engines in order until one succeeds.
TEMPLATES = [
    default_template_engine_settings,
    non_html_template_engine_settings,
]
########################################################################
# LOGGING SETTINGS
########################################################################

ZULIP_PATHS = [
    ("SERVER_LOG_PATH", "/var/log/zulip/server.log"),
    ("ERROR_FILE_LOG_PATH", "/var/log/zulip/errors.log"),
    ("MANAGEMENT_LOG_PATH", "/var/log/zulip/manage.log"),
    ("WORKER_LOG_PATH", "/var/log/zulip/workers.log"),
    ("JSON_PERSISTENT_QUEUE_FILENAME", "/home/zulip/tornado/event_queues.json"),
    ("EMAIL_LOG_PATH", "/var/log/zulip/send_email.log"),
    ("EMAIL_MIRROR_LOG_PATH", "/var/log/zulip/email_mirror.log"),
    ("EMAIL_DELIVERER_LOG_PATH", "/var/log/zulip/email-deliverer.log"),
    ("EMAIL_CONTENT_LOG_PATH", "/var/log/zulip/email_content.log"),
    ("LDAP_SYNC_LOG_PATH", "/var/log/zulip/sync_ldap_user_data.log"),
    ("QUEUE_ERROR_DIR", "/var/log/zulip/queue_error"),
    ("DIGEST_LOG_PATH", "/var/log/zulip/digest.log"),
    ("ANALYTICS_LOG_PATH", "/var/log/zulip/analytics.log"),
    ("ANALYTICS_LOCK_DIR", "/home/zulip/deployments/analytics-lock-dir"),
    ("API_KEY_ONLY_WEBHOOK_LOG_PATH", "/var/log/zulip/webhooks_errors.log"),
    ("SOFT_DEACTIVATION_LOG_PATH", "/var/log/zulip/soft_deactivation.log"),
]

# The Event log basically logs most significant database changes,
# which can be useful for debugging.
if EVENT_LOGS_ENABLED:
    ZULIP_PATHS.append(("EVENT_LOG_DIR", "/home/zulip/logs/event_log"))
else:
    EVENT_LOG_DIR = None

for (var, path) in ZULIP_PATHS:
    if DEVELOPMENT:
        # if DEVELOPMENT, store these files in the Zulip checkout
        if path.startswith("/var/log"):
            path = os.path.join(DEVELOPMENT_LOG_DIRECTORY, os.path.basename(path))
        else:
            path = os.path.join(os.path.join(DEPLOY_ROOT, 'var'), os.path.basename(path))
    vars()[var] = path

ZULIP_WORKER_TEST_FILE = '/tmp/zulip-worker-test-file'


if IS_WORKER:
    FILE_LOG_PATH = WORKER_LOG_PATH
else:
    FILE_LOG_PATH = SERVER_LOG_PATH
# Used for test_logging_handlers
LOGGING_NOT_DISABLED = True

DEFAULT_ZULIP_HANDLERS = (
    (['zulip_admins'] if ERROR_REPORTING else []) +
    ['console', 'file', 'errors_file']
)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            '()': 'zerver.lib.logging_util.ZulipFormatter',
        }
    },
    'filters': {
        'ZulipLimiter': {
            '()': 'zerver.lib.logging_util.ZulipLimiter',
        },
        'EmailLimiter': {
            '()': 'zerver.lib.logging_util.EmailLimiter',
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'nop': {
            '()': 'zerver.lib.logging_util.ReturnTrue',
        },
        'require_logging_enabled': {
            '()': 'zerver.lib.logging_util.ReturnEnabled',
        },
        'require_really_deployed': {
            '()': 'zerver.lib.logging_util.RequireReallyDeployed',
        },
        'skip_200_and_304': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': zerver.lib.logging_util.skip_200_and_304,
        },
        'skip_boring_404s': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': zerver.lib.logging_util.skip_boring_404s,
        },
        'skip_site_packages_logs': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': zerver.lib.logging_util.skip_site_packages_logs,
        },
    },
    'handlers': {
        'zulip_admins': {
            'level': 'ERROR',
            'class': 'zerver.logging_handlers.AdminZulipHandler',
            # For testing the handler delete the next line
            'filters': ['ZulipLimiter', 'require_debug_false', 'require_really_deployed'],
            'formatter': 'default'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'default'
        },
        'file': {
            'level': 'DEBUG',
            'class': 'logging.handlers.WatchedFileHandler',
            'formatter': 'default',
            'filename': FILE_LOG_PATH,
        },
        'errors_file': {
            'level': 'WARNING',
            'class': 'logging.handlers.WatchedFileHandler',
            'formatter': 'default',
            'filename': ERROR_FILE_LOG_PATH,
        },
    },
    'loggers': {
        # The Python logging module uses a hierarchy of logger names for config:
        # "foo.bar" has parent "foo" has parent "", the root.  But the semantics
        # are subtle: it walks this hierarchy once to find the log level to
        # decide whether to log the record at all, then a separate time to find
        # handlers to emit the record.
        #
        # For `level`, the most specific ancestor that has a `level` counts.
        # For `handlers`, the most specific ancestor that has a `handlers`
        # counts (assuming we set `propagate=False`, which we always do.)
        # These are independent -- they might come at the same layer, or
        # either one could come before the other.
        #
        # For `filters`, no ancestors count at all -- only the exact logger name
        # the record was logged at.
        #
        # Upstream docs: https://docs.python.org/3/library/logging
        #
        # Style rules:
        #  * Always set `propagate=False` if setting `handlers`.
        #  * Setting `level` equal to the parent is redundant; don't.
        #  * Setting `handlers` equal to the parent is redundant; don't.
        #  * Always write in order: level, filters, handlers, propagate.

        # root logger
        '': {
            'level': 'INFO',
            'filters': ['require_logging_enabled'],
            'handlers': DEFAULT_ZULIP_HANDLERS,
        },

        # Django, alphabetized
        'django': {
            # Django's default logging config has already set some
            # things on this logger.  Just mentioning it here causes
            # `logging.config` to reset it to defaults, as if never
            # configured; which is what we want for it.
        },
        'django.request': {
            'level': 'WARNING',
            'filters': ['skip_boring_404s'],
        },
        'django.security.DisallowedHost': {
            'handlers': ['file'],
            'propagate': False,
        },
        'django.server': {
            'filters': ['skip_200_and_304'],
            'handlers': ['console', 'file'],
            'propagate': False,
        },
        'django.template': {
            'level': 'DEBUG',
            'filters': ['require_debug_true', 'skip_site_packages_logs'],
            'handlers': ['console'],
            'propagate': False,
        },

        ## Uncomment the following to get all database queries logged to the console
        # 'django.db': {
        #     'level': 'DEBUG',
        #     'handlers': ['console'],
        #     'propagate': False,
        # },

        # other libraries, alphabetized
        'pika.adapters': {  # This library is super chatty on INFO.
            'level': 'WARNING',
        },
        'requests': {
            'level': 'WARNING',
        },
        'tornado.general': {
            # sockjs.tornado sends a lot of ERROR level logs to this
            # logger.  These should not result in error emails/Zulips.
            #
            # TODO: Ideally, we'd do something that just filters the
            # sockjs.tornado logging entirely, since other Tornado
            # logging may be of interest.  Might require patching
            # sockjs.tornado to do this correctly :(.
            'handlers': ['console', 'file'],
            'propagate': False,
        },

        # our own loggers, alphabetized
        'zulip.management': {
            'handlers': ['file', 'errors_file'],
            'propagate': False,
        },
        'zulip.queue': {
            'level': 'WARNING',
        },
        'zulip.soft_deactivation': {
            'handlers': ['file', 'errors_file'],
            'propagate': False,
        },
        'zulip.zerver.webhooks': {
            'handlers': ['file', 'errors_file'],
            'propagate': False,
        },
    }
}

ACCOUNT_ACTIVATION_DAYS = 7

LOGIN_REDIRECT_URL = '/'

# Client-side polling timeout for get_events, in milliseconds.
# We configure this here so that the client test suite can override it.
# We already kill the connection server-side with heartbeat events,
# but it's good to have a safety.  This value should be greater than
# (HEARTBEAT_MIN_FREQ_SECS + 10)
POLL_TIMEOUT = 90 * 1000

# iOS App IDs
ZULIP_IOS_APP_ID = 'org.zulip.Zulip'

########################################################################
# SSO AND LDAP SETTINGS
########################################################################

USING_APACHE_SSO = ('zproject.backends.ZulipRemoteUserBackend' in AUTHENTICATION_BACKENDS)

if len(AUTHENTICATION_BACKENDS) == 1 and (AUTHENTICATION_BACKENDS[0] ==
                                          "zproject.backends.ZulipRemoteUserBackend"):
    HOME_NOT_LOGGED_IN = "/accounts/login/sso"
    ONLY_SSO = True
else:
    HOME_NOT_LOGGED_IN = '/login'
    ONLY_SSO = False
AUTHENTICATION_BACKENDS += ('zproject.backends.ZulipDummyBackend',)

# Redirect to /devlogin by default in dev mode
if DEVELOPMENT:
    HOME_NOT_LOGGED_IN = '/devlogin'
    LOGIN_URL = '/devlogin'

POPULATE_PROFILE_VIA_LDAP = bool(AUTH_LDAP_SERVER_URI)

if POPULATE_PROFILE_VIA_LDAP and \
   'zproject.backends.ZulipLDAPAuthBackend' not in AUTHENTICATION_BACKENDS:
    AUTHENTICATION_BACKENDS += ('zproject.backends.ZulipLDAPUserPopulator',)
else:
    POPULATE_PROFILE_VIA_LDAP = 'zproject.backends.ZulipLDAPAuthBackend' in AUTHENTICATION_BACKENDS or POPULATE_PROFILE_VIA_LDAP

if REGISTER_LINK_DISABLED is None:
    # The default for REGISTER_LINK_DISABLED is a bit more
    # complicated: we want it to be disabled by default for people
    # using the LDAP backend that auto-creates users on login.
    if (len(AUTHENTICATION_BACKENDS) == 2 and
            ('zproject.backends.ZulipLDAPAuthBackend' in AUTHENTICATION_BACKENDS)):
        REGISTER_LINK_DISABLED = True
    else:
        REGISTER_LINK_DISABLED = False

########################################################################
# SOCIAL AUTHENTICATION SETTINGS
########################################################################

SOCIAL_AUTH_FIELDS_STORED_IN_SESSION = ['subdomain', 'is_signup', 'mobile_flow_otp']
SOCIAL_AUTH_LOGIN_ERROR_URL = '/login/'

SOCIAL_AUTH_GITHUB_SECRET = get_secret('social_auth_github_secret')
SOCIAL_AUTH_GITHUB_SCOPE = ['user:email']
SOCIAL_AUTH_GITHUB_ORG_KEY = SOCIAL_AUTH_GITHUB_KEY
SOCIAL_AUTH_GITHUB_ORG_SECRET = SOCIAL_AUTH_GITHUB_SECRET
SOCIAL_AUTH_GITHUB_TEAM_KEY = SOCIAL_AUTH_GITHUB_KEY
SOCIAL_AUTH_GITHUB_TEAM_SECRET = SOCIAL_AUTH_GITHUB_SECRET

########################################################################
# EMAIL SETTINGS
########################################################################

# Django setting. Not used in the Zulip codebase.
DEFAULT_FROM_EMAIL = ZULIP_ADMINISTRATOR

if EMAIL_BACKEND is not None:
    # If the server admin specified a custom email backend, use that.
    pass
elif not EMAIL_HOST and PRODUCTION:
    # If an email host is not specified, fail silently and gracefully
    EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
elif DEVELOPMENT:
    # In the dev environment, emails are printed to the run-dev.py console.
    EMAIL_BACKEND = 'zproject.backends.EmailLogBackEnd'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST_PASSWORD = get_secret('email_password')
EMAIL_GATEWAY_PASSWORD = get_secret('email_gateway_password')
AUTH_LDAP_BIND_PASSWORD = get_secret('auth_ldap_bind_password')

# Set the sender email address for Django traceback error reporting
if SERVER_EMAIL is None:
    SERVER_EMAIL = ZULIP_ADMINISTRATOR

########################################################################
# MISC SETTINGS
########################################################################

if PRODUCTION:
    # Filter out user data
    DEFAULT_EXCEPTION_REPORTER_FILTER = 'zerver.filters.ZulipExceptionReporterFilter'

# This is a debugging option only
PROFILE_ALL_REQUESTS = False

CROSS_REALM_BOT_EMAILS = set(('feedback@zulip.com', 'notification-bot@zulip.com', 'welcome-bot@zulip.com'))

CONTRIBUTORS_DATA = os.path.join(STATIC_ROOT, 'generated/github-contributors.json')
