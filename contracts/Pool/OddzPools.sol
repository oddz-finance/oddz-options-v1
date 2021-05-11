// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./AbstractOddzPool.sol";

contract OddzDefaultPool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ALL";
        poolDetails._underlying = "ALL";
        poolDetails._optionType = "ALL";
        poolDetails._model = "ALL";
        poolDetails._maxExpiration = "UNLIMITED";
    }
}

contract OddzEthUsdCallBS1Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "1 Day";
    }
}

contract OddzEthUsdCallBS2Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "2 Days";
    }
}

contract OddzEthUsdCallBS7Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "7 Days";
    }
}

contract OddzEthUsdCallBS14Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "14 Days";
    }
}

contract OddzEthUsdCallBS30Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "30 Days";
    }
}

contract OddzEthUsdPutBS1Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "1 Day";
    }
}

contract OddzEthUsdPutBS2Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "2 Days";
    }
}

contract OddzEthUsdPutBS7Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "7 Days";
    }
}

contract OddzEthUsdPutBS14Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "14 Days";
    }
}

contract OddzEthUsdPutBS30Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "ETH";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "30 Days";
    }
}

contract OddzBtcUsdCallBS1Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "1 Day";
    }
}

contract OddzBtcUsdCallBS2Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "2 Days";
    }
}

contract OddzBtcUsdCallBS7Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "7 Days";
    }
}

contract OddzBtcUsdCallBS14Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "14 Days";
    }
}

contract OddzBtcUsdCallBS30Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "CALL";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "30 Days";
    }
}

contract OddzBtcUsdPutBS1Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "1 Day";
    }
}

contract OddzBtcUsdPutBS2Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "2 Days";
    }
}

contract OddzBtcUsdPutBS7Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "7 Days";
    }
}

contract OddzBtcUsdPutBS14Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "14 Days";
    }
}

contract OddzBtcUsdPutBS30Pool is AbstractOddzPool {
    PoolDetails public override poolDetails;

    constructor() {
        poolDetails._strike = "BTC";
        poolDetails._underlying = "USD";
        poolDetails._optionType = "PUT";
        poolDetails._model = "Black Scholes";
        poolDetails._maxExpiration = "30 Days";
    }
}
