const passport = require('passport');
const Admin = require('./models/Admin');
const LocalStrategy = require('passport-local').Strategy;

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    done(null, await Admin.findById(id));
  } catch (e) {
    done(e, false);
  }
});

passport.use('local.signin', new LocalStrategy({
  usernameField: 'name',
  passwordField: 'pass'
}, async (user, pass, done) => {
  try {
    const existingUser = await Admin.findOne({
      $or: [
        {
          name: user,
        },
        {
          displayName: user
        }
      ]
    });

    if (!existingUser) return done(null, false, { message: 'Usuario no registrado.' });

    return done(null, existingUser);
  } catch (err) {
    return done(err, false);
  }
}));

/* passport.use('local.signup', new LocalStrategy({
  usernameField: 'user',
  passwordField: 'pass',
  passReqToCallback: true
}, async (req, user, pass, done) => {
  try {
    const user = await Admin.findOne({ user: user });

    if (user) {
      return done(null, false, { message: 'Nombre de usuario ya registrado' });
    }

    let newUser = new Admin({
      name: user,
      displayName: req.body.displayName,
      pass: pass
    });

    try {
      await newUser.save();
      return done(null, newUser);
    } catch (e) {
      return done(e, false, { message: e.message });
    }
  } catch (e) {
    done(e, false);
  }
})); */
