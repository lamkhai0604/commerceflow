import { IApiResponse, ListParams, ListResponse } from 'models';
import { IUser } from 'models/types/user';
import axiosClient from './axiosClient';

const userApi = {
    getUserList(params: ListParams): Promise<ListResponse<IUser>> {
        return axiosClient.get('/users', { params });
    },
    getUserInfoById(id: string): Promise<IApiResponse<IUser>> {
        return axiosClient.get(`/users/${id}`);
    },
    addNewuser(data: IUser): Promise<IUser> {
        return axiosClient.post('/users', data);
    },
};

export default userApi;
