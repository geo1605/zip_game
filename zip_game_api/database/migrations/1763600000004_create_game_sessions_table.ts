import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_sessions'

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
        .enum('status', ['in_progress', 'completed', 'abandoned'])
        .notNullable()
        .defaultTo('in_progress')
      table.timestamp('started_at').notNullable()
      table.timestamp('finished_at').nullable()
      table.integer('elapsed_seconds').unsigned().notNullable().defaultTo(0)
      table.integer('mistakes_count').unsigned().notNullable().defaultTo(0)
      table.integer('hints_used').unsigned().notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'status'], 'idx_game_sessions_user_status')
      table.index(['user_id', 'level_id'], 'idx_game_sessions_user_level')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
