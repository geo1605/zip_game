import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'levels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name', 100).notNullable()
      table.enum('difficulty', ['easy', 'medium', 'hard']).notNullable().defaultTo('easy')
      table.integer('grid_size').unsigned().notNullable().defaultTo(6)
      table.json('clues').notNullable()
      table.json('solution').notNullable()
      table.boolean('is_generated').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['difficulty'], 'idx_levels_difficulty')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
