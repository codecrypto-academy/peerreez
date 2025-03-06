const expres = require("express")
const cors = require("cors")
const db = require("./db")
const app = expres()
app.use(cors())
app.listen(5555)

app.get("/ping", (req, res) => { 
    res.send({fecha:new Date()})
})

app.get("/products", async (req, res) =>{
    try {
        const [r,f] = await db.q("Select * from Products", [])
        res.send(r)
    } catch (error) {
        console.error("Error fetching products:", error)
        res.status(500).send({ message: "Internal Server Error" })
    }
})

app.get("/products/:id", async (req, res) =>{
    try {
        const [r,f] = await db.q("Select * from Products where ProductID = ?", [req.params.id])
        res.send(r)
    } catch (error) {
        console.error("Error fetching products:", error)
        res.status(500).send({ message: "Internal Server Error" })
    }
})