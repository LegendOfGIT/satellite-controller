const fastify = require('fastify')({
    logger: true
});

fastify.put('/observable-items', async (request, reply) => {
    reply.type('application/json').code(200);
    reply.send(request.body);
})

fastify.listen(3001, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
});
