import logging


class AppLogger:
    @staticmethod
    def get_logger(name):
        return logging.getLogger(name)