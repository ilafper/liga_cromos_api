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

app.get("/api/cromosRamdom", async (req, res) => {
  try {
    const { cromos } = await connectToMongoDB();
    const lista_clientes = await cromos.find().toArray();
    //console.log(lista_clientes);
    const sobre_cartas = lista_clientes
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    res.json({ success: true, mensaje: "cromos aleatorios", sobre_cartas });
  } catch (error) {
    res.status(400).json({ error: "Error al obtener los clientes" });
  }
});

app.get("/api/random", async (req, res) => {
  //1. obtener selecciones
  //134516
  const url ="https://www.thesportsdb.com/api/v1/json/123/search_all_teams.php?l=FIFA%20World%20Cup";
  const response = await fetch(url);
  const seleciones_mundial = await response.json();
  // eequipos del mundial
  let equipos = seleciones_mundial.teams;
  //coger 6 equipos randoms
  const seleccionados = equipos.sort(() => Math.random() - 0.5).slice(0, 6);
  // lista vacia donde iran los jugadores
  let jugadores_aleatorios = [];
  //console.log(seleccionados);
  
  
  for (let cada_equipo of seleccionados) {
    const jugadoresRes = await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id=${cada_equipo.idTeam}`);

    //https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id=133604
    const jugadoresData = await jugadoresRes.json();

    if (jugadoresData.player) {
      //coger jugador aleatorio de cada equipo
      const randomPlayer =jugadoresData.player[Math.floor(Math.random() * jugadoresData.player.length)];

      jugadores_aleatorios.push({
        jugador: randomPlayer.strPlayer,
        equipo: randomPlayer.strTeam,
        imagen_player: randomPlayer.strCutout || randomPlayer.strThumb,
        seleccion:randomPlayer.strNationality,
        logo_seleccion: cada_equipo.strLogo
      });
      //console.log(jugadores_aleatorios);
      

    }
  }
  //console.log(jugadores_aleatorios);

  res.json({ success: true, mensaje: "cromos aleatorios", jugadores_aleatorios });
});

//todos jugadores


app.get("/api/allplayers", async (req, res) => {
  //1. obtener selecciones
  
  const url ="https://www.thesportsdb.com/api/v1/json/123/search_all_teams.php?l=FIFA%20World%20Cup";
  const response = await fetch(url);
  const seleciones_mundial = await response.json();
  // eequipos del mundial
  let equipos = seleciones_mundial.teams;
  
  // lista vacia donde iran los jugadores
  let todos_jugadores = [];
  //console.log(seleccionados);
  
  
  for (let cada_equipo of equipos) {
    const jugadoresRes = await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id=${cada_equipo.idTeam}`);

    //https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id=133604
    const jugadoresData = await jugadoresRes.json();
    if (jugadoresData.player) {
      const jugadores_equipos= jugadoresData.player;
      for (let cada_jugador of jugadores_equipos) {
       todos_jugadores.push({
        nombre_jugador:cada_jugador.strPlayer,
        logo_seleccion:cada_equipo.strLogo,
        imagen_player:cada_jugador.strCutout
       });
        
      }
    }

    
    
  }
  //console.log(jugadores_aleatorios);

  res.json({ success: true, mensaje: "cromos aleatorios", todos_jugadores });
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
