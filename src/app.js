const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const { Op } = require("sequelize")
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.params
    //console.log('id:' + id)
    const contract = await Contract.findOne({where: {id}})
    if(!contract) return res.status(404).end()
    res.json(contract)
})

/**
 * All contracts belonging to a user
 */
app.get('/contracts', async (req, res) =>{
    const {Contract} = req.app.get('models')
    const contracts = await Contract.findAll()
    if(!contracts) return res.status(404).end()
    res.json(contracts)
})

/**
 * Get all unpaid jobs for a user (either a client or contractor), for active contracts only
 */
app.get('/jobs/unpaid', async (req, res) =>{
    const {Contract} = req.app.get('models')
    const contracts = await Contract.findAll({
        attributes: ['id'], 
        where: { status : 'in_progress' }
    })
    console.log('contracts ids: ' + JSON.stringify(contracts))
    const ids = contracts.map(contract => contract.id)
    console.log('ids: ' + JSON.stringify(ids))

    const {Job} = req.app.get('models')
    const jobs = await Job.findAll({
        where : { paid :{ [Op.not]: true }, ContractId : ids }
    })
    if(!jobs) return res.status(404).end()
    res.json(jobs)
})

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 */
app.post('/jobs/:job_id/pay', async (req, res) =>{
    // TODO
})

/**
 * Deposits money into the the the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 */
app.post('/balances/deposit/:userId', async (req, res) =>{
    // TODO
})

/**
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 */
app.get('/admin/best-profession', async (req, res) =>{
    const {Profile} = req.app.get('models')
    const profiles = await Profile.findAll({
        where : { type:'contractor' }
    })
    const contractorIds = profiles.map(profile => profile.id)
    //console.log('contractorIds: ' + JSON.stringify(contractorIds))

    const {Contract} = req.app.get('models')
    const contracts = await Contract.findAll({
        attributes : ['id', 'ContractorId'],
        where : { ContractorId : contractorIds }
    })
    const contractIds = contracts.map(contract => contract.id)

    const contractsMap = {}
    for (let i=0; i<contracts.length; i++){
        contractsMap[contracts[i].id] = contracts[i]
    }
    //console.log('contractsMap: ' + JSON.stringify(contractsMap))

    const {Job} = req.app.get('models')
    const jobs = await Job.findAll({
        attributes : ['price', 'ContractId'],
        where : {
            ContractId : contractIds,
            paymentDate : { [Op.between]: [new Date(req.query.start), new Date(req.query.end)] }
        }
    })
    //console.log('jobs: ' + JSON.stringify(jobs))

    const paidContractorSums = {}
    for (let job of jobs){
        let contractorId = contractsMap[job.ContractId].ContractorId
        //console.log('========= contractorId: ' + contractorId)
        if (!paidContractorSums[contractorId]) paidContractorSums[contractorId] = 0;
        paidContractorSums[contractorId] += job.price
    }

    let maxPaid = 0;
    let maxPaidContractor = null;
    for (let contractorId in paidContractorSums){
        if (paidContractorSums[contractorId] > maxPaid){
            maxPaid = paidContractorSums[contractorId];
            maxPaidContractor = contractorId;
        }
    }
    //console.log('###### maxPaidContractor:' + maxPaidContractor)

    let bestPaidProfession = ''
    for (let profile of profiles){
        //console.log('>>>>> Profile:' + JSON.stringify(profile))
        if (profile.id == maxPaidContractor){
            bestPaidProfession = profile.profession
            break;
        }
    }
    //console.log('@@@@@@ bestPaidProfession: ' + bestPaidProfession)

    if(!bestPaidProfession) return res.status(404).end()
    res.end('Best paid profession is ' + bestPaidProfession)
})

/**
 * returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.
 */
app.get('/admin/best-clients?start=<date>&end=<date>&limit=<integer>', async (req, res) =>{
    // TODO
})

/**************************/

/**
 * Get all profiles
 */
app.get('/profiles', async (req, res) =>{
    const {Profile} = req.app.get('models')
    const profiles = await Profile.findAll()
    if(!profiles) return res.status(404).end()
    res.json(profiles)
})

/**
 * Get all jobs
 */
app.get('/jobs', async (req, res) =>{
    const {Job} = req.app.get('models')
    const jobs = await Job.findAll()
    if(!jobs) return res.status(404).end()
    res.json(jobs)
})

module.exports = app;
