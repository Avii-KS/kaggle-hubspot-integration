import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../connection";

interface BabyNameAttributes {
  id: number;
  name: string;
  sex: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BabyNameCreationAttributes
  extends Optional<BabyNameAttributes, "id"> {}

export class BabyName
  extends Model<BabyNameAttributes, BabyNameCreationAttributes>
  implements BabyNameAttributes
{
  public id!: number;
  public name!: string;
  public sex!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BabyName.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    sex: {
      type: DataTypes.ENUM("M", "F", "Male", "Female"),
      allowNull: false,
      validate: {
        isIn: [["M", "F", "Male", "Female"]],
      },
    },
  },
  {
    tableName: "baby_names",
    sequelize,
    timestamps: true,
    indexes: [
      {
        name: "idx_name",
        fields: ["name"],
      },
    ],
  }
);
