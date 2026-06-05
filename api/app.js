const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcryptjs");
const { z, regex } = require("zod");
const app = express();
app.use(express.json());

const uri =
  "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("ESta conectado, Go go go go");
    const db = client.db("liga_cromos");
    return {
      usuarios: db.collection("usuarios"),
      cromos: db.collection("cromos"),
    };
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    throw new Error("Error al conectar a la base de datos");
  }
}

app.get("/api/cromos", async (req, res) => {
  try {
    const { cromos } = await connectToMongoDB();
    const lista_cromos = await cromos.find().toArray();
    //console.log(lista_clientes);

    res.json({ success: true, mensaje: "cromos aleatorios", lista_cromos });
  } catch (error) {
    res.status(400).json({ error: "Error al obtener los clientes" });
  }
});

app.post("/api/abrirsobre", async (req, res) => {
  try {
    const { cromos } = await connectToMongoDB();
    const { usuarios } = await connectToMongoDB();
    const code_user = req.body.code_user;
    const lista_clientes = await cromos.find().toArray();
    //console.log(lista_clientes);
    const sobre_cartas = lista_clientes.sort(() => Math.random() - 0.5).slice(0, 6);

     // busacar usuario
    const usuario = await usuarios.findOne({ code_user: code_user });
    
    if (!usuario) {
      return res.status(404).json({ success: false, mensaje: "Usuario no encontrado" });
    }
    
    // actualizar la lista del usuario
    await usuarios.updateOne(
      {code_user:code_user},
      { $push:{lista_cromos:{ $each: sobre_cartas
      }}}
    );
    console.log("sobres de cartas:", sobre_cartas);
    res.json({ success: true, mensaje: "cromos aleatorios", sobre_cartas , lista_cromos: usuario.lista_cromos });
  } catch (error) {
    res.status(400).json({ error: "Error al obtener los cromos" });
  }
});




//datos usuarios
app.get("/api/datosusuarios/:code_user", async (req, res) => {
  try {
    
    const code_user = req.params.code_user;
    console.log("obteniendo datos del usuario con code_user:", code_user);
    const { usuarios } = await connectToMongoDB();
    const lista_usuarios = await usuarios.find({ code_user }).toArray();
    //console.log(lista_clientes);


    res.json({ success: true, mensaje: "lista cromos usuario",  lista_cromos: lista_usuarios[0].lista_cromos });
  } catch (error) {
    res.status(400).json({ error: "Error al obtener los clientes" });
  } 
});




//api login
app.post("/api/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

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
      password,
      usuario.password
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
        correo: usuario.correo,
        lista_cromos: usuario.lista_cromos,
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

app.post("/api/registro", async (req, res) => {
  try {
    const { nombre, correo, password1, password2 } = req.body;
    console.log(nombre, correo, password1, password2);
    
    const { usuarios } = await connectToMongoDB();
    // validacion con zod

    const resultado = z
      .object({
        nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
        correo: z.email("Correo electrónico inválido"),
        password1: z
          .string()
          .min(3, "La contraseña debe tener al menos 3 caracteres"),
        password2: z
          .string()
          .min(3, "La contraseña debe tener al menos 3 caracteres"),
        //validaciones personalizadas en vez de las .min que son predefinidas de zod
      })
      .refine((data) => data.password1 === data.password2, {
        message: "Las contraseñas no coinciden",
        path: ["password2"],
      })
      .safeParse({ nombre, correo, password1, password2 });

    if (!resultado.success) {
      console.log("sisis zod");
      const primerError = resultado.error?.issues?.[0]?.message;
      console.log(primerError);

      return res.status(400).json({
        success: false,
        message: primerError,
      });
    }

    // Verificar contraseñas
    if (password1 !== password2) {
      return res.status(400).json({
        success: false,
        message: "Las contraseñas no coinciden",
      });
    }

    // Verificar correo duplicado
    const usuarioExistente = await usuarios.findOne({ correo });
    if (usuarioExistente) {
      return res.status(409).json({
        success: false,
        message: "El correo ya está registrado",
      });
    }

    // Hashear contraseña
    const saltRounds = 10;

    const contraseñaHasheada = await bcrypt.hash(password1, saltRounds);

    const code_user = "Codigo" + Math.floor(Math.random() * 1000);

    const nuevoUsuario = {
      nombre,
      correo,
      password: contraseñaHasheada,
      code_user,
      lista_cromos: [],
    };

    await usuarios.insertOne(nuevoUsuario);

    // devolver respuesta
    res.json({
      success: true,
      message: "Usuario creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

//eliminar producto por id





module.exports = app;
