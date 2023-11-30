const configuration = require('./configuration/app-config')();
const httpClient = require('axios');

let categoriesToObserve = [];
let fastLaneItems = [];
let regularLaneItems = [];

const availableSites = [
    '100-percent-pure-de_DE',
    '60beans-de_DE',
    'amazon-de_DE',
    'amd-moebel-de_DE',
    'artgerecht-de_DE',
    'asian-foodlovers-de_DE',
    'backmarket-de_DE',
    'bear-family-de_DE',
    'beautywelt-de_DE',
    'big-green-smile-de_DE',
    'black-is-beautiful-de_DE',
    'bruno-banani-de_DE',
    'buch24-de_DE',
    'carrera-toys-de_DE',
    'club-of-wine-de_DE',
    'dress-for-less-de_DE',
    'dunleath-de_DE',
    'ebrosia-de_DE',
    'enners-shop-de_DE',
    'flaconi-de_DE',
    'fussmatten-welt-de_DE',
    'galapel-de_DE',
    'gewuerzland-de_DE',
    'haymancoffee-de_DE',
    'hoerner-de_DE',
    'idee-shop-de_DE',
    'inhofer-de_DE',
    'iwmh-chair-de_DE',
    'jan-vanderstorm-de_DE',
    'laco-de_DE',
    'littlehipstar-de_DE',
    'medimops-de_DE',
    'messmer-de_DE',
    'metabrew-society-de_DE',
    'mytoys-de_DE',
    'natural-food-de_DE',
    'oh-my-fantasy-de_DE',
    'otto-de_DE',
    'pakama-de_DE',
    'plantlife-de_DE',
    'quelle-de_DE',
    'reifen-de_DE',
    'sandawha-de_DE',
    'saunaloft-de_DE',
    'shop-apotheke-de_DE',
    'shop24direct-de_DE',
    'silkes-weinkeller-de_DE',
    'songmics-de_DE',
    'studibuch-de_DE',
    'third-of-life-de_DE',
    'timber-taste-de_DE',
    'top-parfuemerie-de_DE',
    'toom-de_DE',
    'vertical-extreme-de_DE',
    'waschbaer-de_DE',
    'white-collection-de_DE'
];
const sitesWithAvailableGtinSearch = [];

const fastify = require('fastify')({
    logger: true
});

let currentSatellitePortIndex = -1;

const getNextSatellitePort = () => {
    currentSatellitePortIndex++;
    const satellitePorts = configuration.services.satellite.ports;

    currentSatellitePortIndex = currentSatellitePortIndex > satellitePorts.length -1 ? 0 : currentSatellitePortIndex;
    return satellitePorts[currentSatellitePortIndex];
}

const regularLane = () => {
    console.log('observe ... (regular)')

    const itemToObserve = regularLaneItems.pop();
    if (itemToObserve) {
        console.log('observing item ... (regular)');
        console.log(`items left (regular): ${regularLaneItems.length}`);

        const url = `http://${configuration.services.satellite.host}:${getNextSatellitePort()}/observe/site/${itemToObserve.siteId}/use-case/${itemToObserve.useCaseId}?itemId=${itemToObserve.productId}&itemCanonical=${itemToObserve.productCanonical}&navigationPath=${(itemToObserve['navigationPath'] || []).join(',')}`;
        console.log(`call (regular): ${url}`);
        httpClient.get(url).catch(() => {});
    }

    const categoryToObserve = categoriesToObserve.pop();
    if (categoryToObserve) {
        availableSites.forEach(availableSite => {
            const url = `http://${configuration.services.satellite.host}:${getNextSatellitePort()}/observe/site/${availableSite}/use-case/${categoryToObserve.id}`;
            console.log(`call (regular): ${url}`);
            httpClient.get(url).catch(() => {});
        });
    }

    setTimeout(() => {
        regularLane();
    }, 2500 + Math.floor(Math.random() * 8000));
};
const fastLane = () => {
    console.log('observe (fast) ...')

    const itemToObserve = fastLaneItems.pop();
    if (itemToObserve) {
        console.log('observing item (fast) ...');
        console.log(`items left (fast): ${fastLaneItems.length}`);

        const url = `http://${configuration.services.satellite.host}:${getNextSatellitePort()}/observe/site/${itemToObserve.siteId}/use-case/${itemToObserve.useCaseId}?itemId=${itemToObserve.productId}&itemCanonical=${itemToObserve.productCanonical}&navigationPath=${(itemToObserve['navigationPath'] || []).join(',')}`;
        console.log(`call (fast): ${url}`);
        httpClient.get(url).catch(() => {});
    }

    setTimeout(() => {
        fastLane();
    }, 1000 + Math.floor(Math.random() * 4000));
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

    regularLaneItems = regularLaneItems.concat(productIds.map(productId => {
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
            regularLaneItems = regularLaneItems.concat(gtins.map(gtin => ({
                siteId: siteWithAvailableGtinSearch,
                useCaseId: 'single-item-by-gtin',
                productId: '{gtin}' === (gtin || '') ? '' : gtin,
                navigationPath
            })));
        });
    }

    reply.send(regularLaneItems);
})

const getSiteIdBySiteInItemId = (siteInItemId) => {
    const mapping = {
        "100pp": '100-percent-pure-de_DE',
        "60beans": '60beans-de_DE',
        afl: 'asian-foodlovers-de_DE',
        artgerecht: 'artgerecht-de_DE',
        amdmoebel: 'amd-moebel-de_DE',
        azo: 'amazon-de_DE',
        backmar: 'backmarket-de_DE',
        bearfam: 'bear-family-de_DE',
        beautywelt: 'beautywelt-de_DE',
        bgs: 'big-green-smile-de_DE',
        bisb: 'black-is-beautiful-de_DE',
        brunban: 'bruno-banani-de_DE',
        buch24: 'buch24-de_DE',
        carrera: 'carrera-toys-de_DE',
        clubofwine: 'club-of-wine-de_DE',
        dfl: 'dress-for-less-de_DE',
        dunleath: 'dunleath-de_DE',
        ebrosia: 'ebrosia-de_DE',
        ennshop: 'enners-shop-de_DE',
        flaco: 'flaconi-de_DE',
        fmw: 'fussmatten-welt-de_DE',
        galapel: 'galapel-de_DE',
        gewuela: 'gewuerzland-de_DE',
        haymancof: 'haymancoffee-de_DE',
        hoerner: 'hoerner-de_DE',
        idee: 'idee-shop-de_DE',
        inho: 'inhofer-de_DE',
        iwmh: 'iwmh-chair-de_DE',
        janvander: 'jan-vanderstorm-de_DE',
        laco: 'laco-de_DE',
        littlehip: 'littlehipstar-de_DE',
        medimops: 'medimops-de_DE',
        mess: 'messmer-de_DE',
        metabrewsoc: 'metabrew-society-de_DE',
        myt: 'mytoys-de_DE',
        natfu: 'natural-food-de_DE',
        ohmyfan: 'oh-my-fantasy-de_DE',
        plantli: 'plantlife-de_DE',
        reifenDE: 'reifen-de_DE',
        otto: 'otto-de_DE',
        paka: 'pakama-de_DE',
        quelle: 'quelle-de_DE',
        sandawha: 'sandawha-de_DE',
        saunaloft: 'saunaloft-de_DE',
        shopapo: 'shop-apotheke-de_DE',
        shop24d: 'shop24direct-de_DE',
        silkeswk: 'silkes-weinkeller-de_DE',
        songmi: 'songmics-de_DE',
        studibu: 'studibuch-de_DE',
        thirdol: 'third-of-life-de_DE',
        timberta: 'timber-taste-de_DE',
        toom: 'toom-de_DE',
        tpf: 'top-parfuemerie-de_DE',
        vertex: 'vertical-extreme-de_DE',
        waschb: 'waschbaer-de_DE',
        whitecol: 'white-collection-de_DE'
    };

    return mapping[siteInItemId] || '';
};

fastify.post('/update-item', async (request, reply) => {
    reply.type('application/json').code(200);

    const { itemId, navigationPath, withHighPriority = false } = request.body;
    console.log(request.body);
    const itemIdTokens = (itemId || '').split('.');

    if (2 !== (itemIdTokens || []).length) {
        reply.send({ error: "given item id is invalid" });
        return;
    }

    const siteId = getSiteIdBySiteInItemId(itemIdTokens[0]);
    const productId = itemIdTokens[1];

    const itemToObserve = {
        siteId,
        useCaseId: 'single-item',
        productId,
        navigationPath
    };

    if (!withHighPriority) {
        fastLaneItems = [itemToObserve].concat(fastLaneItems);
    }
    else {
        fastLaneItems.push(itemToObserve);
    }

    reply.send({ error: "" });
});

fastify.listen({ host: configuration.application.host, port: 3001 }, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`);

    regularLane();
    fastLane();
});
