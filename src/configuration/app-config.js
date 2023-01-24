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
                        host: '127.0.0.1'
                    }
                }
            },
            production: {
                application: {
                    host: '0.0.0.0'
                },
                services: {
                    satellite: {
                        host: 'satellite'
                    }
                }
            }
        }

        return configuration[environment];
    };