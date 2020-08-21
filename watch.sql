CREATE TABLE IF NOT EXISTS `shares` (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        VARCHAR(255) NOT NULL DEFAULT '',
  lastprice   VARCHAR(255) NOT NULL DEFAULT '',
  url         VARCHAR(255) NOT NULL DEFAULT '',
  alarm       VARCHAR(255) NOT NULL DEFAULT 'gt',
  alarmlimit  float NOT NULL DEFAULT 0,
  cooldown    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `tgusers`(
  tgId      INTEGER NOT NULL ,
  username  VARCHAR(255) NOT NULL DEFAULT '',
  accepted  INTEGER NOT NULL DEFAULT 0, /* 0-> ignore, 1-> accepted */
  unique (tgId) on conflict ignore
);

CREATE  TABLE IF NOT EXISTS `log`(
  `utime`   INTEGER NOT NULL DEFAULT 0,
  `time`    VARCHAR(255) NOT NULL DEFAULT '',
  `function` VARCHAR(255) NOT NULL DEFAULT '',
  `message` text
)