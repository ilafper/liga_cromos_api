const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require("bcryptjs");
const { z, regex } = require('zod');
const app = express();
app.use(express.json());

const uri = "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("ESta conectado, Go go go go");
    const db = client.db('liga_cromos');
    return {
      usuarios: db.collection('usuarios'),
      cromos:db.collection('cromos')
    };
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    throw new Error('Error al conectar a la base de datos');
  }
}


app.get('/api/cromos', async (req, res) => {
  try {
    const { cromos } = await connectToMongoDB();
    const lista_cromos = await cromos.find().toArray();
    //console.log(lista_clientes);

    res.json({ success: true,mensaje:"cromos aleatorios" , lista_cromos});
  } catch (error) {
    res.status(400).json({ error: 'Error al obtener los clientes' });
  }
});


app.get('/api/cromosRamdom', async (req, res) => {
  try {
    const { cromos } = await connectToMongoDB();
    const lista_clientes = await cromos.find().toArray();
    //console.log(lista_clientes);
    const sobre_cartas = lista_clientes.sort(() => Math.random() - 0.5).slice(0, 6);

    res.json({ success: true,mensaje:"cromos aleatorios" , sobre_cartas});
  } catch (error) {
    res.status(400).json({ error: 'Error al obtener los clientes' });
  }
});

app.get("/api/random",async (req,res) =>{
  //1. obtener selecciones 
  let selecciones_mundial='https://www.thesportsdb.com/api/v1/json/123/search_all_teams.php?l=FIFA%20World%20Cup';
  //2. 
  let seleciones_random = selecciones_mundial.sort(()=> Math.random () - 0.5).slice(0.6);

  res.json({ success: true,mensaje:"cromos aleatorios" , seleciones_random});
});







//api login

app.post("/api/login", async (req, res) => {
  
  try {
    const { correo, password } = req.body;

    console.log("Intentando login para:", correo);

    // Conectar a MongoDB
    const { usuarios } = await connectToMongoDB();

    //buscar usuario
    const usuario = await usuarios.findOne({ correo, password });

    // si existe usuario
    if (!usuario) {
      console.log("Usuario no encontrado");
      return res.status(401).json({
        success: false,
        message: "No existe este usuario, crea uno",
      });
    }

    console.log("Login exitoso para:", usuario.correo);

    
    const respuesta = {
      success: true,
      message:"Inicio Sesion Exitoso",
      user: {
        correo: usuario.correo,
        
      },
    };

    res.json(respuesta);
    
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});



app.post("/api/registro", async (req, res) => {
  try {

    const { nombre, correo, password1, password2 } = req.body;

    const { usuarios } = await connectToMongoDB();
    // validacion con zod

    const resultado = z.object({
      nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
      correo: z.email("Correo electrónico inválido"), 
      password: z.string().min(3, "La contraseña debe tener al menos 3 caracteres"),
      password2: z.string().min(3, "La contraseña debe tener al menos 3 caracteres")
      //validaciones personalizadas en vez de las .min que son predefinidas de zod
    }).refine(data => data.contraseña === data.contraseña2, {
      message: "Las contraseñas no coinciden",
      path: ["contraseña2"]
      
    }).safeParse({ nombre, correo, contraseña, contraseña2 });

     if (!resultado.success) {
      console.log("sisis zod");
      const primerError = resultado.error?.issues?.[0]?.message;
      console.log(primerError);
      
      return res.status(400).json({
        success: false,
        message: primerError  
      });
    }


    // Verificar contraseñas
    if (password1 !== password2) {
      return res.status(400).json({ 
        success: false,
        message: "Las contraseñas no coinciden" 
      });
    }

    // Verificar correo duplicado
    const usuarioExistente = await usuarios.findOne({ correo });
    if (usuarioExistente) {
      return res.status(409).json({ 
        success: false,
        message: "El correo ya está registrado" 
      });
    }


    // Hashear contraseña
    const saltRounds = 10;

    const contraseñaHasheada = await bcrypt.hash(contraseña, saltRounds);

    const code_user = 'Codigo' + Math.floor(Math.random() * 1000);

    const nuevoUsuario = {
      nombre,
      correo,
      password: contraseñaHasheada,
      code_user,
      lista_cromos:[]
    };

    await usuarios.insertOne(nuevoUsuario);

    // devolver respuesta 
    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      user: {
        nombre,
        apellidos,
        correo,
        code_user
      }
    });

  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor" 
    });
  }
});



 //eliminar producto por id
 
app.delete("/api/eliminarcliente/:id", async (req, res) => {
  const { clientes } = await connectToMongoDB();

  try {
    const id_eliminar = req.params.id;

    console.log(id_eliminar);
    
    // borrar el borrar y su e vento
    const resultado = await clientes.deleteOne({ code_user: id_eliminar});

 
    if (resultado.deletedCount === 0 ) {
      return res.status(404).json({success:false, error: "No se encontro el cliente" });
    }

    res.json({success:true, mensaje: "cliente con id: " + id_eliminar + "eliminado correctamente" });

  } catch (error) {
    res.status(500).json({ error: "Error al eliminar", detalle: error.message });
  }

});



app.get("/api/filtronombre/:nombreBusqueda", async (req, res) => {
  const { clientes } = await connectToMongoDB();

  try {
    const nombreBusqueda = req.params.nombreBusqueda; 
    console.log("Buscando nombre:", nombreBusqueda);

    if (!nombreBusqueda) {
      return res.status(400).json({ success: false, error: "Debes enviar un nombre" });
    }

    // busqueda parcial del campo nombre
    const filtroNombre = await clientes.find({ nombre: new RegExp(nombreBusqueda, 'i') }).toArray();
    console.log(filtroNombre);

    if (filtroNombre.length=== 0 ) {
      console.log("no hay coincidencias");
      return res.json({ success: false, error:"no hay coincidencias"});
    }


    res.json({ success: true, mensaje:"todas las coincidencias", datos: filtroNombre });

  } catch (error) {
    res.status(500).json({ success: false, error: "Error al encontrar", detalle: error.message });
  }
});


//filtro apellidos

app.get("/api/filtroapellidos/:apeBusqueda", async (req, res) => {
  const { clientes } = await connectToMongoDB();

  try {
    const apeBusqueda = req.params.apeBusqueda; 
    console.log("Buscando apellido:", apeBusqueda);

    if (!apeBusqueda) {
      return res.status(400).json({ success: false, error: "Debes enviar un apellido" });
    }

    // busqueda parcial del campo nombre
    const filtroapellidos = await clientes.find({ apellidos: new RegExp(apeBusqueda, 'i') }).toArray();
    console.log(filtroapellidos);

    if (filtroapellidos.length=== 0 ) {
      console.log("no hay coincidencias");
      return res.json({ success: false, error:"no hay coincidencias"});
    }


    res.json({ success: true, mensaje:"todas las coincidencias", datos: filtroapellidos });

  } catch (error) {
    res.status(500).json({ success: false, error: "Error al encontrar", detalle: error.message });
  }
});




app.get("/api/filtrotelefono/:tlfBusqueda", async (req, res) => {
  const { clientes } = await connectToMongoDB();

  try {
    const tlfBusqueda = req.params.tlfBusqueda; 
    console.log("Buscando apellido:", tlfBusqueda);

    if (!tlfBusqueda) {
      return res.status(400).json({ success: false, error: "Debes enviar un apellido" });
    }

    // busqueda parcial del campo nombre
    const filtrotelefono = await clientes.find({ telefono: new RegExp(tlfBusqueda, 'i') }).toArray();
    
    console.log(filtrotelefono);

    if (filtrotelefono.length=== 0 ) {
      console.log("no hay coincidencias");
      return res.json({ success: false, error:"no hay coincidencias"});
    }

    res.json({ success: true, mensaje:"resultado filtro: ", datos: filtrotelefono });

  } catch (error) {
    res.status(500).json({ success: false, error: "Error al encontrar", detalle: error.message });
  }
});



app.get("/api/filtrocorreo/:correoBusqueda", async (req, res) => {
  const { clientes } = await connectToMongoDB();

  try {
    const correoBusqueda = req.params.correoBusqueda; 
    console.log("Buscando correo:", correoBusqueda);

    if (!correoBusqueda) {
      return res.status(400).json({ success: false, error: "Debes enviar un apellido" });
    }

    // busqueda parcial del campo correo
    const filtrocorreo = await clientes.find({ correo: new RegExp(correoBusqueda, 'i') }).toArray();
    
    console.log(filtrocorreo);

    if (filtrocorreo.length=== 0 ) {
      console.log("no hay coincidencias");
      return res.json({ success: false, error:"no hay coincidencias"});
    }
    

    res.json({ success: true, mensaje:"todas las coincidencias", datos: filtrocorreo });

  } catch (error) {
    res.status(500).json({ success: false, error: "Error al encontrar", detalle: error.message });
  }
});



app.get("/api/filtrodireccion/:direcionBusqueda", async (req, res) => {
  const { clientes } = await connectToMongoDB();

  try {
    const filtroDirec = req.params.direcionBusqueda; 
    console.log("Buscando correo:", filtroDirec);

    if (!filtroDirec) {
      return res.status(400).json({ success: false, error: "Debes enviar un dato" });
    }

    // busqueda parcial del campo correo
    const filtrodireccion = await clientes.find({ direccion: new RegExp(filtroDirec, 'i') }).toArray();
    
    console.log(filtrodireccion);

    if (filtrodireccion.length=== 0 ) {
      console.log("no hay coincidencias");
      return res.json({ success: false, error:"no hay coincidencias"});
    }
    

    res.json({ success: true, mensaje:"todas las coincidencias", datos: filtrodireccion });

  } catch (error) {
    res.status(500).json({ success: false, error: "Error al encontrar", detalle: error.message });
  }
});







module.exports = app;