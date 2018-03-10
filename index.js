(function () {
    'use strict';

    const Gdax = require('gdax');
    const authedClient = new Gdax.AuthenticatedClient(
        process.env.GDAX_KEY,
        process.env.GDAX_SECRET,
        process.env.GDAX_PASSPHRASE,
        process.env.GDAX_URL
    );
    const publicClient = new Gdax.PublicClient(process.env.GDAX_URL);
    exports.handler = function index(event, context, callback) {
        event = event || {};
        let message = "";
        callback = callback || (() => console.log(message));
        let action = event.action || 'sell';
        let coin = event.coin || 'BTC';
        let amount = event.amount || '.01';
        let buySellFactor = action === 'buy' ? -1 : 1;
        let numberOfLadderSteps = event.numberOfLadderSteps || 10;
        let shouldCancelOrders = event.shouldCancelOrders || false;
        let isMarket = event.isMarket || false;
        let logOrder = data => {
            message += `\norder placed ${JSON.stringify(data)}`;
        };
        let logError = error => {
            message += `\nerror\n${JSON.stringify(error)}`;
        }
        var addOrders = () => {
            publicClient.getProductOrderBook(`${coin}-USD`)
                .then(data => {
                    let currentPrice = data.bids[0][0];
                    // First make a market buy
                    if (isMarket){
                        postOrder(amount);
                    }
                    for (let i = 0; i < numberOfLadderSteps; i++) {
                        let price = parseFloat(currentPrice) + (currentPrice * i * 0.001 * buySellFactor);
                        price = price.toFixed(2);
                        price = Number(price) + buySellFactor * 0.02;
                        postOrder(amount, price);
                    }
                    callback(null, message);
                })
                .catch(logError);

        };
        if (shouldCancelOrders) {
            authedClient.cancelAllOrders({
                    product_id: `${coin}-USD`
                }, addOrders);
        } else {
            addOrders();
        }

        let postOrder = (size, limitPrice) => {
            let buySellParams = {
                side: action,
                size: size,
                product_id: `${coin}-USD`
            };
            if (limitPrice) {
                buySellParams.price = limitPrice; // USD
                buySellParams.type = 'limit';
                buySellParams.post_only = true;
            } else {
                buySellParams.type = 'market';
            }
            authedClient.placeOrder(buySellParams)
                .then(logOrder)
                .catch(logError);
        }
    };
    exports.handler();
})();