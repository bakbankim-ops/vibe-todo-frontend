export const todoSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['title', 'completed', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
      _id: { bsonType: 'objectId' },
      title: { bsonType: 'string', minLength: 1, maxLength: 200 },
      description: { bsonType: 'string', maxLength: 2000 },
      completed: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
}
