const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

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
      clientes: db.collection('usuarios'),
    };
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    throw new Error('Error al conectar a la base de datos');
  }
}



app.get('/api/cromos', async (req, res) => {
  try {
    const { clientes } = await connectToMongoDB();
    const lista_clientes = await clientes.find().toArray();
    //console.log(lista_clientes);
    
    res.json({ success: true,mensaje:"todos los clientes Sisi" , lista_clientes});
  } catch (error) {
    res.status(400).json({ error: 'Error al obtener los clientes' });
  }
});

//api login

app.post("/api/login", async (req, res) => {
  
  try {
    const { correo, contraseña } = req.body;

    console.log("Intentando login para:", correo);

    // Conectar a MongoDB
    const { usuarios } = await connectToMongoDB();

    //buscar usuario
    const usuario = await usuarios.findOne({ correo });

    // si existe usuario
    if (!usuario) {
      console.log("Usuario no encontrado");
      return res.status(401).json({
        success: false,
        message: "No existe este usuario, crea uno",
      });
    }

    // comparar contraseñas con bcrypt
    const contraseñaValida = await bcrypt.compare(
      contraseña,
      usuario.contraseña
    );

    if (!contraseñaValida) {
      console.log("Contraseña incorrecta");
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectas",
      });
    }

    console.log("Login exitoso para:", usuario.nombre);

    
    const respuesta = {
      success: true,
      message:"Inicio Sesion Exitoso",
      user: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        code_user: usuario.code_user
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



/*
//Crear cliente 
app.post('/api/crearcliente', async (req, res) => {
  try {
    // recpger los datos 
    const {nombre, apellidos,telefono,direccion,correo} = req.body;

    if(!nombre || !apellidos || !telefono || !direccion || !correo){
      res.status(400).json({
      success: false,
      message: "rellena todos los campo correctamente"
    });
    }
    
    console.log("datos datos:",nombre, apellidos, telefono, direccion, correo);
    // quitar espacio al inicio y fin.

    let tele= telefono.trim();
    console.log("tele tele telefono",tele);
    
    const { clientes } = await connectToMongoDB();
    // crear el esquema para validar con zod
    const resultado = z.object({
      nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
      apellidos: z.string().min(3, "Los apellidos deben tener al menos 3 caracteres"),
      //valedar en el tlf no meter letras y un minimo y maximo
      tele: z.string().regex(/^\d+$/, "El teléfono debe contener solo números").min(7,"minimo 7 digitos").max(15,'maximo 15 digitos'),
      correo: z.email("Correo electrónico inválido"),
      direccion:z.string().min(5, "la direccion debe estar correcta ").max(100, 'la longitud no puede ser mayor que 100 caracteres'),
    }).safeParse({nombre, apellidos,tele,direccion,correo});

    // coger el mensaje de error para mostarar
     if (!resultado.success) {
      console.log("sisis zod");
      //resultado.error?.issues?.[0]?.message;
      const primerError = resultado.error?.issues?.[0]?.message;;
      console.log(primerError);
      
      return res.status(400).json({
        success: false,
        message: primerError  
      });
    }


    // Verificar correo duplicado
    const usuarioExistente = await clientes.findOne({ correo: correo.toLowerCase()});
    
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false,
        message: "El correo ya está registrado" 
      });
    }


    const code_user = 'codigo' + Math.floor(Math.random() * 1000);
    // nuevo user
    
    const nuevoUsuario = {
      nombre,
      apellidos,
      telefono:tele,
      direccion,
      correo,
      code_user
    };


    console.log("nuevo nuevo",nuevoUsuario);
    //insertar en l base de datos 
    await clientes.insertOne(nuevoUsuario);

    // mensaje final correcto si fue bien
    res.status(200).json({
      success: true,
      message: "Usuario creado exitosamente",
      user: {
        nombre,
        apellidos,
        tele,
        direccion,
        correo,
        code_user
      }
    });

    
  } catch (error) {
    console.error("Error al guardar el cliente", error);
    res.status(500).json({ error: 'Error interno del servidor al crear el producto' });
  }

});

*/


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