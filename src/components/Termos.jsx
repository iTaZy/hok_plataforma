import React from 'react';

const s = {
  page: {
    minHeight: '100vh',
    background: '#0b0f19',
    color: '#cbd5e1',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: '60px 20px',
  },
  container: {
    maxWidth: '760px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '48px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  logo: {
    fontSize: '28px',
    color: '#fff',
    fontWeight: 700,
    letterSpacing: '-1px',
    marginBottom: '8px',
  },
  meta: {
    fontSize: '13px',
    color: '#475569',
  },
  h1: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#fff',
    margin: '40px 0 12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(243,156,18,0.25)',
  },
  h2: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e2e8f0',
    margin: '24px 0 8px',
  },
  p: {
    fontSize: '14px',
    lineHeight: 1.75,
    margin: '0 0 12px',
    color: '#94a3b8',
  },
  ul: {
    paddingLeft: '20px',
    margin: '0 0 12px',
  },
  li: {
    fontSize: '14px',
    lineHeight: 1.75,
    color: '#94a3b8',
    marginBottom: '4px',
  },
  infoBox: {
    background: 'rgba(243,156,18,0.07)',
    border: '1px solid rgba(243,156,18,0.2)',
    borderRadius: '10px',
    padding: '14px 18px',
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.65,
    margin: '16px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    margin: '12px 0',
  },
  th: {
    background: 'rgba(243,156,18,0.1)',
    color: '#f39c12',
    fontWeight: 600,
    padding: '10px 14px',
    textAlign: 'left',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  td: {
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#94a3b8',
  },
  email: {
    color: '#f39c12',
    textDecoration: 'none',
  },
  footer: {
    marginTop: '60px',
    paddingTop: '24px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    fontSize: '13px',
    color: '#475569',
    textAlign: 'center',
  },
};

function Section({ id, title, children }) {
  return (
    <section id={id}>
      <h2 style={s.h1}>{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <h3 style={s.h2}>{title}</h3>
      {children}
    </div>
  );
}

function P({ children }) {
  return <p style={s.p}>{children}</p>;
}

function Ul({ items }) {
  return (
    <ul style={s.ul}>
      {items.map((item, i) => <li key={i} style={s.li}>{item}</li>)}
    </ul>
  );
}

export default function Termos() {
  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.header}>
          <div style={s.logo}>HoK <span style={{ color: '#f39c12' }}>HuB</span></div>
          <p style={{ ...s.p, margin: '4px 0 0' }}>Termos de Uso</p>
          <p style={s.meta}>Versão 1.0 · Última atualização: 28 de junho de 2026</p>
        </div>

        <Section id="aceitacao" title="1. Aceitação dos Termos">
          <P>
            Ao acessar e usar a plataforma HoK HuB ("Plataforma", "Serviço"), você concorda
            em estar vinculado a estes Termos de Uso. Se você não concorda com qualquer parte
            destes termos, não use a Plataforma.
          </P>
          <P>Ao usar a Plataforma, você declara que:</P>
          <Ul items={[
            'Tem pelo menos 18 anos de idade',
            'Tem autoridade legal para celebrar este acordo',
            'Leu e compreende estes termos na íntegra',
            'Concorda com a Política de Privacidade',
          ]} />
          <div style={s.infoBox}>
            Atenção: por exigir idade mínima de 18 anos, a plataforma não é destinada a menores
            de idade. Caso identifiquemos uso por menores, a conta será encerrada imediatamente.
          </div>
        </Section>

        <Section id="servico" title="2. Descrição do Serviço">
          <P>
            HoK HuB é uma plataforma comunitária dedicada ao jogo Honor of Kings que oferece:
          </P>
          <Ul items={[
            'Estatísticas e análise de jogabilidade',
            'Sistema de ranking e matchmaking competitivo',
            'Guias e tutoriais sobre heróis',
            'Chat e comunicação entre jogadores',
            'Ferramentas competitivas',
            'Histórico de partidas',
          ]} />
          <P>
            <strong style={{ color: '#e2e8f0' }}>Aviso:</strong> HoK HuB é uma plataforma
            comunitária não oficial. Honor of Kings é marca registrada da Tencent Games.
            Não temos vínculo oficial com a Tencent.
          </P>
        </Section>

        <Section id="conta" title="3. Conta de Usuário">
          <SubSection title="3.1 Criação de Conta">
            <P>Para usar a Plataforma, você deve:</P>
            <Ul items={[
              'Fornecer informações precisas e completas',
              'Manter suas informações atualizadas',
              'Manter a confidencialidade de sua senha',
              'Ser responsável por todas as atividades em sua conta',
            ]} />
          </SubSection>
          <SubSection title="3.2 Responsabilidade da Conta">
            <P>
              Você é inteiramente responsável por todas as atividades sob sua conta, incluindo
              manter a segurança de sua senha, notificar-nos imediatamente de acesso não autorizado
              e qualquer violação destes termos praticada por meio da sua conta.
            </P>
          </SubSection>
          <SubSection title="3.3 Suspensão e Cancelamento">
            <P>Reservamos o direito de suspender ou cancelar sua conta nas seguintes hipóteses:</P>
            <Ul items={[
              'Violação destes termos',
              'Uso da plataforma para atividades ilegais',
              'Comportamento abusivo ou assédio a outros usuários',
              'Inatividade superior a 12 meses — você será notificado por e-mail 30 dias antes',
              'Não pagamento de taxas (se aplicável no futuro)',
            ]} />
          </SubSection>
        </Section>

        <Section id="conduta" title="4. Código de Conduta">
          <SubSection title="4.1 Comportamento Proibido">
            <P><strong style={{ color: '#e2e8f0' }}>Cheating e Fraude:</strong></P>
            <Ul items={[
              'Usar hacks, aimbots ou modificações não autorizadas',
              'Explorar bugs intencionalmente',
              'Compartilhar contas com terceiros',
              'Usar softwares não autorizados',
            ]} />
            <P><strong style={{ color: '#e2e8f0' }}>Assédio e Abuso:</strong></P>
            <Ul items={[
              'Assédio sexual ou discriminação de qualquer natureza',
              'Ameaças ou incitação à violência',
              'Bullying ou perseguição a outros usuários',
              'Publicação de conteúdo ofensivo ou discriminatório',
            ]} />
            <P><strong style={{ color: '#e2e8f0' }}>Spam e Conteúdo Inadequado:</strong></P>
            <Ul items={[
              'Spam ou publicidade não autorizada',
              'Conteúdo pornográfico ou violento',
              'Phishing ou tentativas de roubo de dados',
              'Distribuição de malware ou vírus',
            ]} />
            <P><strong style={{ color: '#e2e8f0' }}>Atividades Ilegais:</strong></P>
            <Ul items={[
              'Atividades criminosas de qualquer natureza',
              'Venda de itens ilegais',
              'Lavagem de dinheiro',
            ]} />
          </SubSection>
          <SubSection title="4.2 Consequências">
            <P>
              Violações podem resultar em aviso formal, suspensão temporária, banimento permanente
              ou, em caso de crime, comunicação às autoridades competentes.
            </P>
          </SubSection>
        </Section>

        <Section id="conteudo" title="5. Conteúdo do Usuário">
          <SubSection title="5.1 Sua Responsabilidade">
            <P>
              Você é responsável por todo conteúdo que publica na plataforma, incluindo mensagens
              no chat, comentários, fotos de perfil e descrições.
            </P>
          </SubSection>
          <SubSection title="5.2 Licença de Conteúdo">
            <P>
              Você retém a propriedade do seu conteúdo, mas ao publicá-lo concede à HoK HuB
              licença não exclusiva para usar, exibir, distribuir e, quando necessário para fins
              de conformidade, modificar ou remover esse conteúdo.
            </P>
          </SubSection>
        </Section>

        <Section id="propriedade" title="6. Propriedade Intelectual">
          <SubSection title="6.1 Propriedade da Plataforma">
            <P>
              Todo conteúdo original da Plataforma — incluindo design, interface, código-fonte,
              textos, documentação e elementos gráficos — é propriedade intelectual de HoK HuB
              ou licenciado por terceiros.
            </P>
          </SubSection>
          <SubSection title="6.2 Restrições de Uso">
            <P>
              É vedado copiar, modificar, criar obras derivadas, vender, distribuir, usar para
              fins comerciais ou realizar engenharia reversa de qualquer parte da Plataforma sem
              autorização expressa por escrito.
            </P>
          </SubSection>
        </Section>

        <Section id="isencao" title="7. Isenção de Responsabilidade">
          <SubSection title="7.1 Serviço fornecido no estado em que se encontra">
            <P>
              A Plataforma é fornecida sem garantias expressas ou implícitas, incluindo
              disponibilidade contínua, precisão de dados, funcionalidade ou compatibilidade
              com todos os dispositivos.
            </P>
          </SubSection>
          <SubSection title="7.2 Limitação de Responsabilidade">
            <P>
              HoK HuB não se responsabiliza por perda de dados, interrupção de serviço, danos
              diretos ou indiretos, lucros cessantes ou danos consequentes. A responsabilidade
              máxima fica limitada ao valor pago pelo usuário nos últimos 12 meses
              (ou R$ 0,00 para contas gratuitas).
            </P>
          </SubSection>
          <SubSection title="7.3 Força Maior">
            <P>
              Não somos responsáveis por eventos fora do nosso controle, como desastres naturais,
              ataques cibernéticos, falhas de infraestrutura de terceiros ou ações governamentais.
            </P>
          </SubSection>
        </Section>

        <Section id="indenizacao" title="8. Indenização">
          <P>
            Você concorda em indenizar e manter HoK HuB isenta de reclamações de terceiros
            decorrentes de violação de direitos autorais, violação destes termos, atividades
            ilegais praticadas por meio da sua conta ou qualquer dano causado a terceiros
            por sua ação ou omissão.
          </P>
        </Section>

        <Section id="links" title="9. Links de Terceiros">
          <P>
            A Plataforma pode conter links para sites de terceiros. Não somos responsáveis
            pelo conteúdo, políticas de privacidade, qualidade ou segurança desses sites.
            O acesso a links externos é de sua inteira responsabilidade.
          </P>
        </Section>

        <Section id="modificacoes" title="10. Modificações do Serviço">
          <P>
            Reservamos o direito de modificar ou descontinuar recursos, alterar preços ou planos,
            atualizar a Plataforma e revisar estes termos. Mudanças significativas serão
            comunicadas com pelo menos 30 dias de antecedência por e-mail ou aviso na plataforma.
          </P>
        </Section>

        <Section id="rescisao" title="11. Rescisão">
          <SubSection title="11.1 Rescisão pelo Usuário">
            <P>
              Você pode encerrar sua conta a qualquer momento em Configurações {'>'} Perfil {'>'} Deletar
              Conta. Seus dados serão removidos em até 30 dias conforme a Política de Privacidade.
            </P>
          </SubSection>
          <SubSection title="11.2 Rescisão pela HoK HuB">
            <P>
              Podemos encerrar sua conta por violação destes termos, atividade suspeita,
              inatividade prolongada (com aviso prévio de 30 dias por e-mail) ou necessidade
              comercial devidamente justificada.
            </P>
          </SubSection>
        </Section>

        <Section id="privacidade" title="12. Privacidade e Dados (LGPD)">
          <P>
            O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade,
            elaborada em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            Para exercer seus direitos como titular de dados, entre em contato com nosso
            encarregado (DPO):{' '}
            <a href="mailto:contatohokhub@gmail.com" style={s.email}>
              contatohokhub@gmail.com
            </a>.
          </P>
        </Section>

        <Section id="legal" title="13. Conformidade Legal">
          <SubSection title="13.1 Leis Aplicáveis">
            <P>
              Estes termos são regidos pelas leis da República Federativa do Brasil, especialmente
              a LGPD (Lei nº 13.709/2018), o Código de Defesa do Consumidor (Lei nº 8.078/1990)
              e o Código Civil Brasileiro (Lei nº 10.406/2002).
            </P>
          </SubSection>
          <SubSection title="13.2 Jurisdição">
            <P>
              Qualquer disputa será submetida ao foro da comarca do Rio de Janeiro, Estado do
              Rio de Janeiro, com renúncia expressa a qualquer outro foro, por mais privilegiado
              que seja.
            </P>
          </SubSection>
          <SubSection title="13.3 Resolução de Conflitos">
            <P>Antes de qualquer medida judicial, as partes se comprometem a:</P>
            <Ul items={[
              'Notificar a HoK HuB pelo e-mail contatohokhub@gmail.com descrevendo o conflito',
              'Aguardar resposta em até 30 dias corridos',
              'Tentar resolução amigável ou mediação extrajudicial',
              'Somente então recorrer ao Poder Judiciário, se necessário',
            ]} />
          </SubSection>
        </Section>

        <Section id="geral" title="14. Disposições Gerais">
          <P>
            Estes termos constituem o acordo integral entre o usuário e HoK HuB. Caso qualquer
            disposição seja declarada inválida, as demais permanecerão em vigor. O não exercício
            de qualquer direito não implica renúncia a ele. O usuário não pode ceder ou transferir
            os direitos e obrigações decorrentes destes termos.
          </P>
        </Section>

        <Section id="contato" title="15. Contato">
          <P>
            Dúvidas gerais:{' '}
            <a href="mailto:contatohokhub@gmail.com" style={s.email}>contatohokhub@gmail.com</a>
          </P>
          <P>
            Privacidade e dados (DPO):{' '}
            <a href="mailto:contatohokhub@gmail.com" style={s.email}>contatohokhub@gmail.com</a>
          </P>
          <P>HoK HuB · Rio de Janeiro, RJ · Brasil · hokhub.com.br</P>
        </Section>

        <Section id="historico" title="16. Histórico de Alterações">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Versão</th>
                <th style={s.th}>Data</th>
                <th style={s.th}>Alterações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>1.0</td>
                <td style={s.td}>28/06/2026</td>
                <td style={s.td}>Versão inicial</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <div style={s.footer}>
          Ao usar HoK HuB, você concorda com estes Termos de Uso.
        </div>

      </div>
    </div>
  );
}
