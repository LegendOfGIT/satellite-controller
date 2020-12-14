const httpClient = require('axios');

let categoriesToObserve = [];
let itemsToObserve = [];

const sitesWithAvailableEanSearch = [
    'amazon-de_DE',
    'thalia-de_DE'
];

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

        const url = `http://127.0.0.1:3000/observe/site/${itemToObserve.siteId}/use-case/${itemToObserve.useCaseId}?itemId=${itemToObserve.productId}&navigationPath=${(itemToObserve['navigationPath'] || []).join(',')}`;
        console.log(`call: ${url}`)
        httpClient.get(url);
    }

    setTimeout(() => {
        observeItem();
    }, 3000 + Math.floor(Math.random() * 30000));
};

fastify.post('/observe-category', async (request, reply) => {
    reply.type('application/json').code(200);

    const requestBody = request.body;
    const categoryId = requestBody['category-id'] || '';

    if (categoryId) {
        const category = categoriesToObserve.find(c => categoryId === c.id);
        const categoryRequestCount = (category || { requestCount: 0 }).requestCount;

        if (!category) {
            categoriesToObserve.push({ id: categoryId, requestCount: 1 });
        }
        else {
            category.requestCount = categoryRequestCount + 1;
        }
    }

    reply.send([...categoriesToObserve].sort((a, b) => a.requestCount < b.requestCount ? 1 : -1 ));
});
fastify.put('/observable-items', async (request, reply) => {
    reply.type('application/json').code(200);

    const requestBody = request.body;
    let productIds = requestBody['product-ids'] || [];
    let navigationPath = requestBody['navigation-path'];
    const siteId = requestBody.site;
    const useCaseId = requestBody.usecase;
    let { eans = [] } = requestBody;
    eans = Array.isArray(eans) ? eans : [eans];

    itemsToObserve = itemsToObserve.concat(productIds.map(productId => ({
        siteId,
        useCaseId,
        productId,
        navigationPath
    })));

    if (eans) {
        sitesWithAvailableEanSearch.forEach((siteWithAvailableEanSearch) => {
            itemsToObserve = itemsToObserve.concat(eans.map(ean => ({
                siteId: siteWithAvailableEanSearch,
                useCaseId: 'single-item-by-ean',
                productId: '{ean}' === (ean || '') ? '' : ean,
                navigationPath
            })));
        });
    }

    reply.send(itemsToObserve);
})

fastify.listen(3001, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`);

    observeItem();
});
