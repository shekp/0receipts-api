interface User {
  authUserId: number;
  authUsername: string;
}

interface InsertAddressBind {
  cityCode: string;
  streetName: string;
  buildingNo: string;
  officeNo: string;
  zipCode: string;
  userData: User;
}

interface AddressDBModel extends InsertAddressBind {
  id: number;
  createUser: string;
  updateUser: string;
  createDate: Date;
  updateDate: Date;
  cityName: string;
  stateName: string;
  countryName: string;
}

interface AddressSelectBind {
  id?: number;
  cityCode?: string;
  streetName?: string;
  buildingNo?: string;
  officeNo?: string;
  zipCode?: string;
}

interface AddressGetParams {
  addressId: string;
}

interface AddressPostBody {
  cityCode: string;
  streetName: string;
  buildingNo: string;
  officeNo: string;
  zipCode: string;
  userData: User;
}

export { InsertAddressBind, AddressDBModel, AddressSelectBind, AddressGetParams, AddressPostBody };
