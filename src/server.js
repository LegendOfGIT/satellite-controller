const configuration = require('./configuration/app-config')();
const httpClient = require('axios');

let categoriesToObserve = [];
let itemsToObserve = [];

const availableSites = [
    '100-percent-pure-de_DE',
    'amazon-de_DE',
    'backmarket-de_DE',
    'bear-family-de_DE',
    'black-is-beautiful-de_DE',
    'big-green-smile-de_DE',
    'buch24-de_DE',
    'dress-for-less-de_DE',
    'enners-shop-de_DE',
    'fussmatten-welt-de_DE',
    'hoerner-de_DE',
    'inhofer-de_DE',
    'iwmh-chair-de_DE',
    'mytoys-de_DE',
    'natural-food-de_DE',
    'pakama-de_DE',
    'reifen-de_DE',
    'shop-apotheke-de_DE',
    'shop24direct-de_DE',
    'studibuch-de_DE',
    'top-parfuemerie-de_DE',
    'toom-de_DE',
    'waschbaer-de_DE',
    'white-collection-de_DE'
];
const sitesWithAvailableGtinSearch = [];

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

        const url = `http://${configuration.services.satellite.host}:3000/observe/site/${itemToObserve.siteId}/use-case/${itemToObserve.useCaseId}?itemId=${itemToObserve.productId}&itemCanonical=${itemToObserve.productCanonical}&navigationPath=${(itemToObserve['navigationPath'] || []).join(',')}`;
        console.log(`call: ${url}`);
        httpClient.get(url).catch(() => {});
    }

    const categoryToObserve = categoriesToObserve.pop();
    if (categoryToObserve) {
        availableSites.forEach(availableSite => {
            const url = `http://${configuration.services.satellite.host}:3000/observe/site/${availableSite}/use-case/${categoryToObserve.id}`;
            console.log(`call: ${url}`);
            httpClient.get(url).catch(() => {});
        });
    }

    setTimeout(() => {
        observeItem();
    }, 5000 + Math.floor(Math.random() * 20000));
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

    const sortedCategoryList = [...categoriesToObserve].sort((a, b) => a.requestCount < b.requestCount ? 1 : -1 );
    reply.send(sortedCategoryList);
});
fastify.put('/observable-items', async (request, reply) => {
    reply.type('application/json').code(200);

    const requestBody = request.body;
    let productIds = requestBody['product-ids'] || [];
    let navigationPath = requestBody['navigation-path'];
    const siteId = requestBody.site;
    const useCaseId = requestBody.usecase;
    let { gtins = [] } = requestBody;
    gtins = Array.isArray(gtins) ? gtins : [gtins];

    itemsToObserve = itemsToObserve.concat(productIds.map(productId => {
        const productIdTokens = (productId || '').split('|');

        return {
            siteId,
            useCaseId,
            productId: productIdTokens[0],
            productCanonical: productIdTokens.length > 1 ? productIdTokens[1] : '',
            navigationPath
        };
    }));

    if (gtins) {
        sitesWithAvailableGtinSearch.forEach((siteWithAvailableGtinSearch) => {
            itemsToObserve = itemsToObserve.concat(gtins.map(gtin => ({
                siteId: siteWithAvailableGtinSearch,
                useCaseId: 'single-item-by-gtin',
                productId: '{gtin}' === (gtin || '') ? '' : gtin,
                navigationPath
            })));
        });
    }

    reply.send(itemsToObserve);
})

const getSiteIdBySiteInItemId = (siteInItemId) => {
    const mapping = {
        'amazon.de': 'amazon-de_DE',
        azo: 'amazon-de_DE',
        backmar: 'backmarket-de_DE',
        bearfam: 'bear-family-de_DE',
        bgs: 'big-green-smile-de_DE',
        bisb: 'black-is-beautiful-de_DE',
        buch24: 'buch24-de_DE',
        dfl: 'dress-for-less-de_DE',
        ennshop: 'enners-shop-de_DE',
        fmw: 'fussmatten-welt-de_DE',
        hoerner: 'hoerner-de_DE',
        inho: 'inhofer-de_DE',
        iwmh: 'iwmh-chair-de_DE',
        myt: 'mytoys-de_DE',
        natfu: 'natural-food-de_DE',
        reifenDE: 'reifen-de_DE',
        otto: 'otto-de_DE',
        paka: 'pakama-de_DE',
        shopapo: 'shop-apotheke-de_DE',
        shop24d: 'shop24direct-de_DE',
        studibu: 'studibuch-de_DE',
        toom: 'toom-de_DE',
        tpf: 'top-parfuemerie-de_DE',
        waschb: 'waschbaer-de_DE',
        whitecol: 'white-collection-de_DE'
    };

    return mapping[siteInItemId] || '';
};

fastify.post('/update-item', async (request, reply) => {
    reply.type('application/json').code(200);

    const { itemId, navigationPath } = request.body;
    console.log(request.body);
    const itemIdTokens = (itemId || '').split('.');

    if (2 !== (itemIdTokens || []).length) {
        reply.send({ error: "given item id is invalid" });
        return;
    }


    const siteId = getSiteIdBySiteInItemId(itemIdTokens[0]);
    const productId = itemIdTokens[1].replaceAll('de-', '');


    itemsToObserve = itemsToObserve.concat({
        siteId,
        useCaseId: 'single-item',
        productId,
        navigationPath
    });

    reply.send({ error: "" });
});

fastify.listen({ host: configuration.application.host, port: 3001 }, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`);

    observeItem();
});
