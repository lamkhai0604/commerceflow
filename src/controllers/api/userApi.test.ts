import { AxiosRequestConfig } from 'axios';
import { IUser } from 'models/types/user';
import axiosClient from './axiosClient';
import userApi from './userApi';

const user: IUser = {
    id: 'test-user',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '1234567890',
    password: 'test-only-password',
};

const originalAdapter = axiosClient.defaults.adapter;

afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter;
});

function respondWith(data: unknown) {
    const adapter = jest.fn(async (config: AxiosRequestConfig) => ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
    }));
    axiosClient.defaults.adapter = adapter;
    return adapter;
}

test('lists users with pagination and returns the unwrapped response', async () => {
    const response = { data: [user], paginations: { _page: 1, _limit: 10 } };
    const adapter = respondWith(response);
    const params = { _page: 1, _limit: 10 };

    await expect(userApi.getUserList(params)).resolves.toEqual(response);
    expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
        method: 'get', url: '/users', params,
    }));
});

test('retrieves a user by ID', async () => {
    const response = { success: true, data: user };
    const adapter = respondWith(response);

    await expect(userApi.getUserInfoById(user.id)).resolves.toEqual(response);
    expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
        method: 'get', url: `/users/${user.id}`,
    }));
});

test('posts registration data and returns the created user', async () => {
    const adapter = respondWith(user);

    await expect(userApi.addNewuser(user)).resolves.toEqual(user);
    expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
        method: 'post', url: '/users', data: JSON.stringify(user),
    }));
});

test('propagates request failures to callers', async () => {
    const error = new Error('Request failed');
    axiosClient.defaults.adapter = jest.fn().mockRejectedValue(error);

    await expect(userApi.getUserList({})).rejects.toBe(error);
    await expect(userApi.getUserInfoById(user.id)).rejects.toBe(error);
    await expect(userApi.addNewuser(user)).rejects.toBe(error);
});
