This is part of the example of using the Open Fields feature from CardCom.

The purpose of this project is to mimic your backend, and it only creates a LowProfile deal to be used in the Open fields module.

Requirements:
    NodeJS (I'm using v18.15.0 while writing this)

In your teminal:
    run `npm install` to install dependencies (This example uses fastify and fastify/cors)
    run `node example` example.js is the entry point

config.json
    By default this project is configured to use CardCom's test terminal (it won't charge your card)
    You should integrate this logic to your own backend for security reasons and switch to your teminal when ready to production