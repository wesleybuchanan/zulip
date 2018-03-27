# System documented in https://zulip.readthedocs.io/en/latest/logging.html

from django.utils.timezone import now as timezone_now
from django.utils.timezone import utc as timezone_utc

import hashlib
import logging
import re
import traceback
from typing import Optional
from datetime import datetime, timedelta
from django.conf import settings
from zerver.lib.str_utils import force_bytes
from logging import Logger

# Adapted http://djangosnippets.org/snippets/2242/ by user s29 (October 25, 2010)

class _RateLimitFilter(object):
    last_error = datetime.min.replace(tzinfo=timezone_utc)

    def filter(self, record):
        # type: (logging.LogRecord) -> bool
        from django.conf import settings
        from django.core.cache import cache

        # Track duplicate errors
        duplicate = False
        rate = getattr(settings, '%s_LIMIT' % self.__class__.__name__.upper(),
                       600)  # seconds
        if rate > 0:
            # Test if the cache works
            try:
                cache.set('RLF_TEST_KEY', 1, 1)
                use_cache = cache.get('RLF_TEST_KEY') == 1
            except Exception:
                use_cache = False

            if use_cache:
                if record.exc_info is not None:
                    tb = force_bytes('\n'.join(traceback.format_exception(*record.exc_info)))
                else:
                    tb = force_bytes(u'%s' % (record,))
                key = self.__class__.__name__.upper() + hashlib.sha1(tb).hexdigest()
                duplicate = cache.get(key) == 1
                if not duplicate:
                    cache.set(key, 1, rate)
            else:
                min_date = timezone_now() - timedelta(seconds=rate)
                duplicate = (self.last_error >= min_date)
                if not duplicate:
                    self.last_error = timezone_now()

        return not duplicate

class ZulipLimiter(_RateLimitFilter):
    pass

class EmailLimiter(_RateLimitFilter):
    pass

class ReturnTrue(logging.Filter):
    def filter(self, record):
        # type: (logging.LogRecord) -> bool
        return True

class ReturnEnabled(logging.Filter):
    def filter(self, record):
        # type: (logging.LogRecord) -> bool
        return settings.LOGGING_NOT_DISABLED

class RequireReallyDeployed(logging.Filter):
    def filter(self, record):
        # type: (logging.LogRecord) -> bool
        from django.conf import settings
        return settings.PRODUCTION

def skip_200_and_304(record):
    # type: (logging.LogRecord) -> bool
    # Apparently, `status_code` is added by Django and is not an actual
    # attribute of LogRecord; as a result, mypy throws an error if we
    # access the `status_code` attribute directly.
    if getattr(record, 'status_code') in [200, 304]:
        return False

    return True

IGNORABLE_404_URLS = [
    re.compile(r'^/apple-touch-icon.*\.png$'),
    re.compile(r'^/favicon\.ico$'),
    re.compile(r'^/robots\.txt$'),
    re.compile(r'^/django_static_404.html$'),
    re.compile(r'^/wp-login.php$'),
]

def skip_boring_404s(record):
    # type: (logging.LogRecord) -> bool
    """Prevents Django's 'Not Found' warnings from being logged for common
    404 errors that don't reflect a problem in Zulip.  The overall
    result is to keep the Zulip error logs cleaner than they would
    otherwise be.

    Assumes that its input is a django.request log record.
    """
    # Apparently, `status_code` is added by Django and is not an actual
    # attribute of LogRecord; as a result, mypy throws an error if we
    # access the `status_code` attribute directly.
    if getattr(record, 'status_code') != 404:
        return True

    # We're only interested in filtering the "Not Found" errors.
    if getattr(record, 'msg') != 'Not Found: %s':
        return True

    path = getattr(record, 'args', [''])[0]
    for pattern in IGNORABLE_404_URLS:
        if re.match(pattern, path):
            return False
    return True

def skip_site_packages_logs(record):
    # type: (logging.LogRecord) -> bool
    # This skips the log records that are generated from libraries
    # installed in site packages.
    # Workaround for https://code.djangoproject.com/ticket/26886
    if 'site-packages' in record.pathname:
        return False
    return True

def find_log_caller_module(record):
    # type: (logging.LogRecord) -> Optional[str]
    '''Find the module name corresponding to where this record was logged.'''
    # Repeat a search similar to that in logging.Logger.findCaller.
    # The logging call should still be on the stack somewhere; search until
    # we find something in the same source file, and that should give the
    # right module name.
    f = logging.currentframe()  # type: ignore  # Not in typeshed, and arguably shouldn't be
    while f is not None:
        if f.f_code.co_filename == record.pathname:
            return f.f_globals.get('__name__')
        f = f.f_back
    return None

logger_nicknames = {
    'root': '',  # This one is more like undoing a nickname.
    'zulip.requests': 'zr',  # Super common.
}

def find_log_origin(record):
    # type: (logging.LogRecord) -> str
    logger_name = logger_nicknames.get(record.name, record.name)

    if settings.LOGGING_SHOW_MODULE:
        module_name = find_log_caller_module(record)
        if module_name == logger_name or module_name == record.name:
            # Abbreviate a bit.
            return logger_name
        else:
            return '{}/{}'.format(logger_name, module_name or '?')
    else:
        return logger_name

log_level_abbrevs = {
    'DEBUG':    'DEBG',
    'INFO':     'INFO',
    'WARNING':  'WARN',
    'ERROR':    'ERR',
    'CRITICAL': 'CRIT',
}

def abbrev_log_levelname(levelname):
    # type: (str) -> str
    # It's unlikely someone will set a custom log level with a custom name,
    # but it's an option, so we shouldn't crash if someone does.
    return log_level_abbrevs.get(levelname, levelname[:4])

class ZulipFormatter(logging.Formatter):
    # Used in the base implementation.  Default uses `,`.
    default_msec_format = '%s.%03d'

    def __init__(self):
        # type: () -> None
        super().__init__(fmt=self._compute_fmt())

    def _compute_fmt(self):
        # type: () -> str
        pieces = ['%(asctime)s', '%(zulip_level_abbrev)-4s']
        if settings.LOGGING_SHOW_PID:
            pieces.append('pid:%(process)d')
        pieces.extend(['[%(zulip_origin)s]', '%(message)s'])
        return ' '.join(pieces)

    def format(self, record):
        # type: (logging.LogRecord) -> str
        if not getattr(record, 'zulip_decorated', False):
            # The `setattr` calls put this logic explicitly outside the bounds of the
            # type system; otherwise mypy would complain LogRecord lacks these attributes.
            setattr(record, 'zulip_level_abbrev', abbrev_log_levelname(record.levelname))
            setattr(record, 'zulip_origin', find_log_origin(record))
            setattr(record, 'zulip_decorated', True)
        return super().format(record)

def create_logger(name, log_file, log_level, log_format="%(asctime)s %(levelname)-8s %(message)s"):
    # type: (str, str, str, str) -> Logger
    """Creates a named logger for use in logging content to a certain
    file.  A few notes:

    * "name" is used in determining what gets logged to which files;
    see "loggers" in zproject/settings.py for details.  Don't use `""`
    -- that's the root logger.
    * "log_file" should be declared in zproject/settings.py in ZULIP_PATHS.

    """
    logging.basicConfig(format=log_format)
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level))

    if log_file:
        formatter = logging.Formatter(log_format)
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger
