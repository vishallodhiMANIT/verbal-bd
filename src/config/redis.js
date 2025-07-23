const { createClient }  = require('redis');

const redisClient = createClient({
    username: 'default',
    password: 'YjHqzKb3hPZ0OEQYTdka7Iq3eeaUJ3t4',
    socket: {
         host: 'redis-13964.c301.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 13964
    }
});

module.exports = redisClient;
