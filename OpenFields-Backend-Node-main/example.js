
// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors');
const fs = require("fs");

//Disabling certificate verification in localhost env only - don't do this in production!
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST'],
})

let rawdata = fs.readFileSync('./config.json');
var configs = JSON.parse(rawdata);

const CreateLPRequest = {
    TerminalNumber: configs.terminalNumber,
    ApiName: configs.apiName,
    Operation: "ChargeOnly", //1
    Amount: 3,
    WebHookUrl: "https://www.google.com/",
    ProductName: 'Product Name',
    Language: 'he',
    ISOCoinId: 1, //ILS,
    FailedRedirectUrl: "https://www.google.com/",
    SuccessRedirectUrl: "https://www.google.com/",
    Document: {
        Name: "User",
        Products: [{ ProductID: "123", Description: "Description", Quantity: 1, UnitCost: 3, TotalLineCost: 3, }],
        IsAllowEditDocument: false,
        IsShowOnlyDocument: false,
        Language: 'he'
    }
}

// Declare a route
fastify.get('/init', async function handler(request, reply) {
    //Create new LP and return the LP code
    try{
        const body = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            strictSSL: false,
            body: JSON.stringify(CreateLPRequest),
        }
        const results = await fetch(`${configs.cardcomUrl}/api/v11/LowProfile/create`, body)
        const json = await results.json();
        return json;
    }catch(e){
        console.error(e)
        return { error: e.message }
    }
})

// Check the transaction status
fastify.post('/check-transaction', async function handler(request, reply) {
    try {
        const { lowProfileCode } = request.body;
        
        if (!lowProfileCode) {
            return reply.status(400).send({ error: 'Missing lowProfileCode' });
        }
        
        const getLowProfileRequest = {
            TerminalNumber: configs.terminalNumber,
            ApiName: configs.apiName,
            LowProfileId: lowProfileCode
        };
        
        const body = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            strictSSL: false,
            body: JSON.stringify(getLowProfileRequest),
        }
        
        const results = await fetch(`${configs.cardcomUrl}/api/v11/LowProfile/GetLpResult`, body);
        const json = await results.json();
        
        console.log('Transaction status check:', { lowProfileCode, status: json.ResponseCode });
        
        return json;
    } catch(e) {
        console.error(e);
        return { error: e.message };
    }
});

// Run the server!
fastify.listen({ port: 8000 }, (err) => {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    console.log('Server is running on port 8000');
})
