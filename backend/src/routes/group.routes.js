const express = require("express")
const router = express.Router()

router.get('/', (req, res) => {
    res.status(200).json({message: 'Get group'})
})

router.post('/', (req, res) => {
    res.status(201).json({message: 'Create group'})
})

router.put('/:id/join', (req, res) => {
    const {id} = req.params;
    res.status(201).json({message: `Join groups`})
})

module.exports = router;