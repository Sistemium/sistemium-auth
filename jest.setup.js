// Tests never connect to Redis: without a client sistemium-redis is disabled and tokenAuth does not cache
process.env.REDIS_AUTO_CONNECT = 'false';
