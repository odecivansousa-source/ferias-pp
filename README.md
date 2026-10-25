# 🛡️ FÉRIAS PP — Sistema de Planejamento e Gestão de Férias da Unidade Prisional

> **Sistema institucional completo de controle de férias para Policiais Penais**, com validação de efetivo mínimo por equipe, prevenção de conflitos em tempo real, controle transacional anti-concorrência no banco de dados e emissão de relatórios oficiais para a Secretaria da Administração Penitenciária (SAP).

---

## 💎 1. Requisito Fundamental: CUSTO ZERO ABSOLUTO

Este sistema foi arquitetado para funcionar **sem nenhum custo financeiro**:
- 🌐 **Hospedagem da Interface:** 100% gratuita no **GitHub Pages** (via GitHub Actions automatizado).
- 🗄️ **Banco de Dados & Autenticação:** 100% gratuito no plano Free do **Supabase** (PostgreSQL com Row-Level Security e Stored Procedures).
- 📱 **Aplicativo Celular (PWA):** Instalação direta na tela inicial de qualquer Android ou iPhone sem pagar taxas de lojas de aplicativos (Google Play ou Apple Store).
- 💻 **Modo Demonstração Offline/Local:** Já vem pré-carregado com 120 policiais penais fictícios divididos em 4 equipes (30 por equipe) para você testar tudo de imediato mesmo sem internet.

---

## 🎯 2. Principais Funcionalidades

### 👮 Para o Policial Penal:
- **Envio Simples pelo Celular:** Acesso rápido e responsivo.
- **3 Modalidades Permitidas:**
  - 30 dias corridos em período único.
  - 2 períodos de 15 dias cada.
  - 3 períodos de 10 dias cada.
- **Radar de Conflito em Tempo Real:** Ao selecionar as datas, o sistema já avisa se as vagas da sua equipe estão disponíveis ou se há conflito antes mesmo de enviar.
- **Acompanhamento Transparente:** Visualize se seu pedido está *Pendente*, *Aprovado*, *Devolvido para Correção* (com o motivo escrito pela Direção) ou *Rejeitado*.

### 🛡️ Para a Diretoria da Unidade:
- **Painel Geral com Indicadores:** Total de policiais, pendências, aprovadas, devolvidas e conflitos no ano.
- **Fila de Decisão:** Analise pedidos com alerta visual de concorrência.
- **Controle Transacional Anti-Concorrência:** O banco de dados PostgreSQL bloqueia aprovações simultâneas que excedam o teto da equipe no mesmo dia.
- **Devolução Orientada:** Devolva para o policial com orientações claras caso precise escolher outro mês.
- **Histórico & Auditoria:** Registro permanente de quem aprovou/devolveu e quando.

### ⚙️ Para a Administração:
- **Gestão do Efetivo (~120 Policiais):** Cadastro, edição, busca por nome/matrícula funcional e lotação nas equipes.
- **Configuração das 4 Equipes:** Altere nomes (ex: Plantões Alfa, Bravo, Charlie, Delta) e defina o **limite de afastamentos simultâneos** e o **efetivo mínimo** de cada plantão.
- **Regras do Exercício Anual:** Defina o ano (ex: 2026/2027), datas de abertura e fechamento das submissões e antecedência mínima.

### 📊 Relatórios Oficiais para a SAP:
- **Relatório Consolidado Geral de Férias**
- **Relatório Separado por Equipe (Plantões 1, 2, 3 e 4)**
- **Relatório de Solicitações Pendentes**
- **Relatório de Conflitos e Ajustes**
- **Relatório de Férias Homologadas / Aprovadas**
- **Exportação Dupla:**
  - 🟢 **CSV (Excel):** Formato padrão brasileiro (UTF-8 com BOM e separador `;`) que abre direto no Microsoft Excel sem distorcer acentuação.
  - 🔴 **PDF Institucional:** Formatado com cabeçalho da SAP, título oficial, dados da unidade, paginação e status colorido.

---

## 🚀 3. Como Rodar no seu Computador (1 Clique)

1. Dê dois cliques no arquivo:
   ```
   EXECUTAR_FERIAS_PP.bat
   ```
2. O navegador abrirá automaticamente em `http://localhost:5173`.
3. Você já entra no sistema com **120 policiais fictícios** prontos para testar todos os 3 perfis (**Policial**, **Diretor** e **Administrador**) no seletor rápido no topo da tela!

---

## ☁️ 4. Como Conectar ao Supabase Gratuito (Opcional)

Para conectar seu próprio banco de dados na nuvem:
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Crie um novo projeto gratuito.
3. No menu lateral do Supabase, vá em **SQL Editor** ➔ **New Query**.
4. Copie todo o conteúdo do arquivo `supabase/schema.sql` deste projeto e clique em **Run**.
5. No menu **Project Settings** ➔ **API**, copie a **Project URL** e a **anon public key**.
6. No sistema **FÉRIAS PP**, clique no botão superior **"⚡ Modo Demo Local"**, cole a URL e a Anon Key e clique em **Salvar**.
7. Pronto! Seu sistema agora salva e consulta dados com segurança militar via RLS e PostgreSQL na nuvem.

---

## 🌐 5. Como Publicar no GitHub Pages Gratuitamente

1. Crie um repositório no seu GitHub (público ou privado).
2. Envie os arquivos da pasta `FERIAS_PP` para o repositório:
   ```bash
   git init
   git add .
   git commit -m "Férias PP - Sistema de Gestão de Férias"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/ferias-pp.git
   git push -u origin main
   ```
3. No GitHub, acesse **Settings** ➔ **Pages** ➔ em **Build and deployment / Source**, selecione **GitHub Actions**.
4. O arquivo `.github/workflows/deploy.yml` já incluído no projeto fará a compilação e publicação automática!
5. Seu site ficará acessível gratuitamente em:
   `https://SEU-USUARIO.github.io/ferias-pp/`

---

## 🔒 Segurança e Boas Práticas

- **Segurança RLS (Row-Level Security):** Todas as tabelas do PostgreSQL possuem políticas de segurança ativadas.
- **Proteção de Chaves:** O navegador só utiliza a chave pública anônima. Nenhuma chave secreta ou `service_role` é exposta.
- **Funções Transacionais:** A aprovação utiliza `SELECT ... FOR UPDATE` no PostgreSQL para prevenir concorrência mesmo se dois diretores clicarem ao mesmo tempo em solicitações que concorrem pela última vaga da equipe.
