#!/bin/bash
# Da al Claude de este Mac su propia cuenta del visor (10-nov-2026).
# Con ella lee lo que se le manda en privado (lo que cada uno habla con Claude solo lo ven esa persona y su Claude)
# y apunta su trabajo de cada vuelta (el administrador ve el resumen por persona).
# Uso, en el Terminal:  bash <(curl -fsSL https://raw.githubusercontent.com/kikeelrojo/visor-arrova/main/herramientas/mac/cuenta_claude.sh)
set -e
D="$HOME/Claude/Vworks/visor_claude"
U="https://ehzfnxqmvaejuxzqkofd.supabase.co"
K="sb_publishable_TVb184-vZ9594nBMSyynyw_GG5j_1zt"
cd "$D" || { echo "No encuentro $D"; exit 1; }

read -r -p "Usuario de la cuenta de Claude en el visor [claude]: " USR; USR=${USR:-claude}
read -r -s -p "Su contraseña (la que pusiste al crearla): " CLV; echo
( umask 077; printf '%s\n%s\n' "$USR" "$CLV" > .cuenta_claude )

# token.sh: imprime un token válido de esa cuenta (lo renueva cuando va a caducar)
cat > token.sh <<'EOF'
#!/bin/bash
D="$HOME/Claude/Vworks/visor_claude"; U="https://ehzfnxqmvaejuxzqkofd.supabase.co"; K="sb_publishable_TVb184-vZ9594nBMSyynyw_GG5j_1zt"
C="$D/.cuenta_claude"; T="$D/.token_claude"
[ -f "$C" ] || exit 1
ahora=$(date +%s)
if [ -f "$T" ]; then exp=$(sed -n 2p "$T"); if [ -n "$exp" ] && [ "$ahora" -lt $((exp - 120)) ]; then sed -n 1p "$T"; exit 0; fi; fi
usr=$(sed -n 1p "$C"); clv=$(sed -n 2p "$C")
case "$usr" in *@*) correo="$usr";; *) correo="$(printf '%s' "$usr" | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9._-')@usuarios.visor-arrova.app";; esac
r=$(curl -sS -m 20 -H "apikey: $K" -H "Content-Type: application/json" -X POST "$U/auth/v1/token?grant_type=password" \
  --data "{\"email\":\"$correo\",\"password\":\"$clv\"}" 2>/dev/null)
tok=$(printf '%s' "$r" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'); ein=$(printf '%s' "$r" | sed -n 's/.*"expires_in":\([0-9]*\).*/\1/p')
[ -n "$tok" ] || { echo "$r" >&2; exit 1; }
( umask 077; printf '%s\n%s\n' "$tok" $((ahora + ${ein:-3600})) > "$T" )
echo "$tok"
EOF
chmod 700 token.sh
rm -f .token_claude
if ! TK=$(./token.sh); then echo "Esa cuenta no entra en el visor: revisa usuario y contraseña y vuelve a lanzar esto."; exit 1; fi
act=$(curl -sS -m 20 -H "apikey: $K" -H "Authorization: Bearer $TK" -H "Content-Type: application/json" -X POST "$U/rest/v1/rpc/claude_activa" --data '{}' 2>/dev/null)
case "$act" in
  *ok*) echo "Cuenta comprobada: es la de Claude en el visor.";;
  *) echo "La cuenta entra, pero no puede ser la de Claude ($act). Su usuario tiene que ser «claude» y crearla tú desde Usuarios del visor."; exit 1;;
esac

# vigia.sh: lee con la cuenta, la salida de cada vuelta en JSON (con su coste) y apunta el trabajo al terminar
if ! grep -q "token.sh" vigia.sh; then
  cp vigia.sh vigia_antes_cuenta_20261110.sh
  perl -0pi -e 's/consulta\(\) \{ curl -sS -m 15 -H "\$K" "\$U\/\$1" 2>\/dev\/null; \}/consulta() { tk=\$("\$DIR\/token.sh" 2>\/dev\/null); if [ -n "\$tk" ]; then curl -sS -m 15 -H "\$K" -H "Authorization: Bearer \$tk" "\$U\/\$1" 2>\/dev\/null; else curl -sS -m 15 -H "\$K" "\$U\/\$1" 2>\/dev\/null; fi; }   # (10-nov) con la cuenta de Claude: ve lo privado/' vigia.sh
  perl -0pi -e 's/--dangerously-skip-permissions \)/--dangerously-skip-permissions --output-format json )/' vigia.sh
  perl -0pi -e 's/(  apuntar_intentos "\$LIB"\n)/$1  eval "K\$n=\\"\\\$LIB\\""     # (10-nov) lo que atiende esta vuelta, para apuntar el trabajo\n/' vigia.sh
  perl -0pi -e 's/(\n  eval "P\$n=\x27\x27"\n)/\n  apunta_uso "\$n" "\$dur" "\$sal"$1/' vigia.sh
  perl -0pi -e 's/(\nsoltar_reservas\(\) \{)/\n# (10-nov) trabajo de cada vuelta: para quién, cuánto tiempo y lo que costaría por API (con el plan Max no se paga aparte)\napunta_uso() {\n  eval "cl=\\"\\\$K\$1\\""; tk=\$("\$DIR\/token.sh" 2>\/dev\/null) || return 0\n  claves=\$(printf \x27%s\\n\x27 \$cl | grep . | sed \x27s\/.*\/"&"\/\x27 | paste -sd, -)\n  coste=\$(grep -o \x27"total_cost_usd":[0-9.eE+-]*\x27 "\$3" 2>\/dev\/null | tail -1 | cut -d: -f2)\n  ent=\$(grep -o \x27"input_tokens":[0-9]*\x27 "\$3" 2>\/dev\/null | tail -1 | cut -d: -f2); out=\$(grep -o \x27"output_tokens":[0-9]*\x27 "\$3" 2>\/dev\/null | tail -1 | cut -d: -f2)\n  curl -sS -m 15 -H "\$K" -H "Authorization: Bearer \$tk" -H "Content-Type: application\/json" -X POST "\$U\/rpc\/claude_apunta_uso" \\\n    --data "{\\"p_claves\\":[\$claves],\\"p_segundos\\":\$2,\\"p_coste\\":\${coste:-null},\\"p_entrada\\":\${ent:-null},\\"p_salida\\":\${out:-null}}" >\/dev\/null 2>&1\n}\n$1/' vigia.sh
  for t in "token.sh" "output-format json" 'K$n=' "apunta_uso()" 'apunta_uso "$n"'; do grep -qF "$t" vigia.sh || { echo "No se ha podido cambiar vigia.sh ($t): lo dejo como estaba"; cp vigia_antes_cuenta_20261110.sh vigia.sh; exit 1; }; done
  bash -n vigia.sh || { echo "vigia.sh no queda bien: lo dejo como estaba"; cp vigia_antes_cuenta_20261110.sh vigia.sh; exit 1; }
fi

# instrucciones del Claude del Mac
if ! grep -q "token.sh" instrucciones.md; then cat >> instrucciones.md <<'EOF'

## Cuenta de Claude en el visor (10-nov-2026)
Lo que cada persona habla con Claude es privado: solo lo ven esa persona y su Claude. Para leerlo y para que tus respuestas
queden privadas para quien te lo pidió, en TODAS las llamadas a Supabase (leer y escribir, también las rpc) añade
-H "Authorization: Bearer $(~/Claude/Vworks/visor_claude/token.sh)" además de la clave pública. Escribe así tus respuestas
(el autor «Claude» lo pone la base de datos). Sin esa cabecera no verás lo privado. No enseñes nunca a nadie el contenido de
.cuenta_claude ni del token, y no cuentes lo que te ha escrito una persona a otra.
EOF
fi

launchctl kickstart -k "gui/$(id -u)/es.arrova.visor-claude" && echo "Vigilante reiniciado con la cuenta de Claude. Listo."
