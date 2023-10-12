module.exports =
    () => {
        const environment = process.env.NODE_ENV || 'production';
        const configuration = {
            development: {
                application: {
                    host: '127.0.0.1'
                },
                services: {
                    satellite: {
                        host: '127.0.0.1',
                        ports: [ 3000 ]
                    }
                }
            },
            production: {
                application: {
                    host: '0.0.0.0'
                },
                services: {
                    satellite: {
                        host: 'satellite',
                        ports: [ 2998, 2999, 3000 ]
                    }
                }
            }
        }

        return configuration[environment];
    };
