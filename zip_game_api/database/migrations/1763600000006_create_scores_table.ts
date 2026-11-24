import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scores'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('level_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('levels')
        .onDelete('CASCADE')
      table
        .integer('game_session_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('game_sessions')
        .onDelete('CASCADE')

      table.integer('points').unsigned().notNullable()
      table.integer('elapsed_seconds').unsigned().notNullable()
      table.integer('mistakes_count').unsigned().notNullable().defaultTo(0)
      table.integer('hints_used').unsigned().notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['points', 'elapsed_seconds'], 'idx_scores_ranking')
      table.index(['user_id', 'level_id'], 'idx_scores_user_level')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
