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
        let amount = event.amount || '.005';
        let buySellFactor = action === 'buy' ? -1 : 1;
        let numberOfLadderSteps = event.numberOfLadderSteps || 12;
        let ladderingPercentage = event.ladderingPercentage || 0.001;
        let shouldCancelOrders = event.shouldCancelOrders || false;
        let isMarket = event.isMarket || false;
        let numberOfMarketBuys = event.numberOfMarketBuys || 1;
        let currentPrice = event.price || 8412;
        let logOrder = data => {
            message += `\norder placed ${JSON.stringify(data)}`;
            console.log(data);
        };
        let logError = error => {
            message += `\nerror\n${JSON.stringify(error)}`;
            console.error(error);
        };
        var addOrders = () => {
            publicClient.getProductTicker(`${coin}-USD`)
                .then(data => {
                    var priceForBuying = data.bid;
                    var priceForSelling = data.ask;
                    if (!currentPrice) {
                        currentPrice = action === 'buy' ? priceForBuying: priceForSelling;
                    }
                    var volume = data.volume;
                    var size = data.size;
                    console.log(data);
                    // First make a market buy
                    if (isMarket){
                        for (let i = 0; i < numberOfMarketBuys; i++) {
                            postOrder(amount);
                        }
                    }
                    for (let i = 0; i < numberOfLadderSteps; i++) {
                        let price = parseFloat(currentPrice) + (currentPrice * i * ladderingPercentage * buySellFactor);
                        price = Number(price);
                        price = price.toFixed(2);
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
        };
    };
    exports.handler();
})();