# Segundo cenário: distribuidora médico-hospitalar (8 consultores)

Conjunto: `experimento/leads-medico.json`, com 220 leads (160 claros, 20 ambíguos e 40 ruins) de uma única empresa fictícia, a Vyra Med. O primeiro experimento (`leads.json`) continua igual e os resultados dele não são apagados.

Todos os comandos abaixo rodam **no servidor** (SSH), na ordem. Nenhum deles deve rodar durante um ensaio ou a apresentação.

## Antes de começar: o que muda no sistema

- O seed troca o perfil e o vetor da Ana, do Bruno, da Carla e do Diego, e cria Eduardo, Fernanda, Gabriel e Helena na equipe da Marina. A partir daí, **todo lead novo** é distribuído entre os 8 perfis médicos. Isso inclui os da demonstração.
- Os leads que já existem não mudam de dono. O relatório do primeiro experimento continua dando os mesmos números, porque ele usa os perfis gravados no `leads.json` e a escolha guardada na timeline de cada lead.
- Nome, senha e equipe de quem já existe não mudam. Se o Diego estiver na equipe de outro gerente, ele continua lá.

## 0. Backup do banco

```bash
docker exec vyra_postgres pg_dump -U vyra vyra_db > /root/backup-vyra-antes-medico-$(date +%F).sql
ls -lh /root/backup-vyra-antes-medico-*.sql
```

O arquivo não pode ter 0 bytes.

## 1. Separar os resultados do primeiro experimento

Agora cada conjunto tem a sua pasta: `resultados/leads/` e `resultados/leads-medico/`. Mova o que já existe, sem apagar nada:

```bash
cd /opt/vyra-app/vyra/api/experimento/resultados
mkdir -p leads
find . -maxdepth 1 -mindepth 1 ! -name leads ! -name leads-medico -exec mv {} leads/ \;
ls leads
cd /opt/vyra-app/vyra
```

Tem que aparecer `envios.json`, `relatorio.md`, `resultados.csv` e `graficos`. Os scripts se recusam a rodar enquanto existir `resultados/envios.json` solto.

## 2. Conferir o conjunto (não usa o banco nem a IA)

```bash
docker exec -e CONJUNTO=leads-medico vyra_api node experimento/validar-conjunto.js
```

Tem que terminar com `✅ Estrutura OK`.

## 3. Rodar o seed

Os 4 consultores novos são criados com a senha que você digitar (ela não aparece na tela). Quem já existe mantém a sua.

```bash
read -s -p "Senha dos consultores novos: " SENHA; echo
docker exec -e SEED_SENHA="$SENHA" vyra_api node prisma/seed.js
unset SENHA
```

Os 8 consultores têm que aparecer com `✅ CONSULTOR: ... (perfil e vetor de 3072d)`. Se algum aparecer com `⚠️ perfil NÃO atualizado`, o Gemini falhou nele: espere 1 minuto e rode o seed de novo.

## 4. Conferir o banco

```bash
docker exec -e CONJUNTO=leads-medico vyra_api node experimento/conferir-banco.js
```

Tem que terminar com `✅ Banco pronto para o envio.`:

- **❌ perfil diferente** ou **❌ sem vetor:** rode o seed de novo.
- **⚠️ outro consultor ativo com vetor:** ele vai disputar os leads e o resultado deixa de medir só os 8 perfis. Desative-o na tela Equipe antes de enviar.

## 5. Ensaio com 6 leads

```bash
docker exec -e CONJUNTO=leads-medico vyra_api node experimento/enviar.js 6
sleep 60
docker exec -e CONJUNTO=leads-medico vyra_api node experimento/relatorio.js | head -30
```

Os 6 têm que ter status 200 e aparecer como avaliados no relatório. São leads da Ana: confira no Kanban que eles chegaram para ela.

## 6. Enviar o resto

São cerca de 22 minutos, porque os envios são espaçados em 6 s. Os 6 do ensaio são pulados sozinhos. Roda em segundo plano, para não parar se o SSH cair:

```bash
docker exec -e CONJUNTO=leads-medico vyra_api node experimento/enviar.js > /root/envio-medico.log 2>&1 &
tail -f /root/envio-medico.log
```

Ctrl+C sai do `tail` sem parar o envio. O envio terminou quando aparecer `Pronto`.

## 7. Esperar a fila esvaziar

```bash
sleep 120
```

## 8. Gerar o relatório

```bash
docker exec -e CONJUNTO=leads-medico vyra_api node experimento/relatorio.js
```

Os arquivos ficam em `/opt/vyra-app/vyra/api/experimento/resultados/leads-medico/`: `relatorio.md`, `resultados.csv` e `graficos/`. O relatório só lê o banco e pode rodar quantas vezes você quiser.

Se aparecer algum lead como `ia_indisponivel`, o Gemini falhou nele. Ele fica fora da conta e o relatório avisa quais foram.

## 9. Trazer para o PC

No PowerShell do PC, não no SSH:

```powershell
scp -r root@187.53.97.12:/opt/vyra-app/vyra/api/experimento/resultados/leads-medico C:\Users\talle\Desktop\Vyra_\resultados-experimento\
```

## Para rodar o relatório do primeiro experimento depois disso

```bash
docker exec vyra_api node experimento/relatorio.js
```

Sem `CONJUNTO`, ele usa o `leads.json` e grava em `resultados/leads/`.
