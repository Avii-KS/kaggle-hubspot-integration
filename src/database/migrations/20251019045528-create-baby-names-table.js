import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("baby_names", {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      sex: {
        type: DataTypes.ENUM("M", "F", "Male", "Female"),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add index for better query performance
    await queryInterface.addIndex("baby_names", ["name"], {
      name: "idx_baby_names_name",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("baby_names");
  },
};
