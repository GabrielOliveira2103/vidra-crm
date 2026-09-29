insert into public.servicos (nome,descricao) values
('Clausura para ar-condicionado','Proteção e acabamento para equipamentos de climatização'),
('Fechamento de sacada','Envidraçamento de sacadas'),('Cobertura em vidro','Coberturas sob medida'),
('Fechamento em vidro','Divisórias e fechamentos'),('Porta de vidro','Portas de vidro sob medida'),
('Porta automática','Abertura automática'),('Porta motorizada','Acionamento por motor'),
('Porta com sensor','Acionamento por presença'),('Porta com botoeira','Acionamento por botão'),
('Película de retenção de calor','Controle solar'),('Película de privacidade','Privacidade para ambientes'),
('Outras películas','Soluções especiais'),('Box de banheiro','Box sob medida'),('Espelho','Espelhos decorativos'),
('Janela','Janelas sob medida'),('Vidros em geral','Soluções personalizadas')
on conflict(nome) do nothing;
