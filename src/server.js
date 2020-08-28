const httpClient = require('axios');

let itemsToObserve = [];

const fastify = require('fastify')({
    logger: true
});

const shuffleArray = (arr) => arr.sort(() => .5 - Math.random());

const observeItem = () => {
    console.log('observe ...')

    const itemToObserve = itemsToObserve.pop();
    if (itemToObserve) {
        itemsToObserve = shuffleArray(itemsToObserve);

        console.log('observing item ...');
        console.log(`items left: ${itemsToObserve.length}`);

        httpClient.get(`http://127.0.0.1:3000/observe/site/${itemToObserve.siteId}/use-case/${itemToObserve.useCaseId}?itemId=${itemToObserve.productId}`);
    }

    setTimeout(() => {
        observeItem();
    }, 3000 + Math.floor(Math.random() * 10000));
};

fastify.put('/observable-items', async (request, reply) => {
    reply.type('application/json').code(200);

    const requestBody = request.body;
    let productIds = requestBody['product-ids'];
    const siteId = requestBody.site;
    const useCaseId = requestBody.usecase;

    itemsToObserve = itemsToObserve.concat(productIds.map(productId => ({
        siteId,
        useCaseId,
        productId
    })));

    reply.send(itemsToObserve);
})

fastify.listen(3001, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`);

    observeItem();
});
